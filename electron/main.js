const { app, BrowserWindow, Tray, Menu, dialog, shell, ipcMain, globalShortcut, Notification } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

const HOST = '127.0.0.1';
const PORT = 8080;
const VITE_PORT = 5173;
const DEV_MODE = !app.isPackaged;

// ---------------------------------------------------------------------------
// Window state persistence
// ---------------------------------------------------------------------------
const stateFile = path.join(app.getPath('userData'), 'window-state.json');
function loadWindowState() {
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf-8')); } catch (_) { return {}; }
}
function saveWindowState(win) {
  const bounds = win.getBounds();
  const state = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, isMaximized: win.isMaximized() };
  try { fs.writeFileSync(stateFile, JSON.stringify(state)); } catch (_) {}
}
let windowState = loadWindowState();

// ---------------------------------------------------------------------------
// Offline / error page
// ---------------------------------------------------------------------------
const OFFLINE_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LLM Wiki</title><style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a1a2e;color:#e0e0e0}
  .box{text-align:center;padding:40px;max-width:500px} h1{font-size:2rem;color:#00d4ff;margin-bottom:8px}
  p{color:#aaa;line-height:1.6} .btn{display:inline-block;margin-top:20px;padding:10px 30px;background:#00d4ff;color:#1a1a2e;border-radius:6px;text-decoration:none;font-weight:600}
  .dots{display:flex;gap:6px;justify-content:center;margin:20px 0} .dot{width:10px;height:10px;border-radius:50%;background:#00d4ff;animation:bounce 1.2s infinite}
  .dot:nth-child(2){animation-delay:.2s} .dot:nth-child(3){animation-delay:.4s}
  @keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
</style></head><body><div class="box"><h1>&#x1F4DA; LLM Wiki</h1>
<div class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
<p>Waiting for backend server to start&hellip;</p><p id="status"></p>
<button class="btn" onclick="location.href=\`http://${HOST}:${PORT}\`">Retry</button></div>
<script>var n=0;setInterval(function(){n++;document.getElementById('status').textContent='Attempt '+n+' of 30...'},1000)</script></body></html>`;

// ---------------------------------------------------------------------------
// Python backend management
// ---------------------------------------------------------------------------
let pythonProcess = null;

// ---------------------------------------------------------------------------
// Vite dev server (dev mode only) — gives us HMR for the React frontend
// ---------------------------------------------------------------------------
let viteProcess = null;

function startVite() {
  const projectRoot = path.join(__dirname, '..');
  const frontendDir = path.join(projectRoot, 'frontend');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  console.log(`[LLM Wiki] Starting Vite dev server (npm run --prefix frontend dev)`);
  viteProcess = spawn(npmCmd, ['run', '--prefix', frontendDir, 'dev'], {
    cwd: projectRoot,
    shell: true,
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  viteProcess.stdout.on('data', d => console.log(`[Vite] ${d.toString().trim()}`));
  viteProcess.stderr.on('data', d => console.error(`[Vite:err] ${d.toString().trim()}`));
  viteProcess.on('close', code => {
    console.log(`[LLM Wiki] Vite exited: ${code}`);
    viteProcess = null;
  });
  viteProcess.on('error', err => {
    console.error(`[LLM Wiki] Failed to start Vite: ${err.message}`);
    viteProcess = null;
  });
}

function stopVite() {
  if (viteProcess) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(viteProcess.pid), '/f', '/t']);
    } else {
      viteProcess.kill('SIGTERM');
    }
    viteProcess = null;
  }
}

function findPython() {
  if (!DEV_MODE) {
    return process.platform === 'win32'
      ? path.join(process.resourcesPath, 'python-dist', 'python.exe')
      : path.join(process.resourcesPath, 'python-dist', 'bin', 'python3');
  }
  const venvPath = process.platform === 'win32'
    ? path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'pypoetry', 'Cache', 'virtualenvs')
    : path.join(process.env.HOME || '', '.cache', 'pypoetry', 'virtualenvs');
  if (fs.existsSync(venvPath)) {
    const dirs = fs.readdirSync(venvPath).filter(d => d.startsWith('llm-wiki-1-'));
    if (dirs.length > 0) {
      const exe = process.platform === 'win32'
        ? path.join(venvPath, dirs[0], 'Scripts', 'python.exe')
        : path.join(venvPath, dirs[0], 'bin', 'python3');
      if (fs.existsSync(exe)) return exe;
    }
  }
  return 'python';
}

function startBackend() {
  const python = findPython();
  const args = ['-m', 'uvicorn', 'app.main:app', '--host', HOST, '--port', String(PORT)];
  if (DEV_MODE) args.push('--reload');
  console.log(`[LLM Wiki] Starting: ${python} ${args.join(' ')}`);
  pythonProcess = spawn(python, args, {
    cwd: DEV_MODE ? path.join(__dirname, '..') : process.resourcesPath,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  });
  pythonProcess.stdout.on('data', d => console.log(`[Python] ${d.toString().trim()}`));
  pythonProcess.stderr.on('data', d => console.error(`[Python:err] ${d.toString().trim()}`));
  pythonProcess.on('close', code => { console.log(`[LLM Wiki] Backend exited: ${code}`); pythonProcess = null; });
  pythonProcess.on('error', err => {
    dialog.showErrorBox('Startup Failed', `Cannot start Python backend:\n${err.message}`);
    app.quit();
  });
}

function stopBackend() {
  if (pythonProcess) {
    if (process.platform === 'win32') { spawn('taskkill', ['/pid', String(pythonProcess.pid), '/f', '/t']); }
    else { pythonProcess.kill('SIGTERM'); }
    pythonProcess = null;
  }
}

function waitForServer(url, retries = 30, interval = 500) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const check = () => {
      n++;
      http.get(url, () => resolve(true)).on('error', () => {
        if (n >= retries) reject(new Error(`Server not ready after ${retries * interval}ms`));
        else setTimeout(check, interval);
      });
    };
    check();
  });
}

// Polls the Vite dev server's / endpoint (or any path) until it responds.
// Vite itself doesn't have a dedicated health endpoint, so we just hit the
// index – it serves index.html as soon as the server is up.
function waitForVite(url, retries = 60, interval = 500) {
  return waitForServer(url, retries, interval);
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  const isMac = process.platform === 'darwin';
  const winOpts = {
    width: windowState.width || 1280,
    height: windowState.height || 860,
    x: windowState.x,
    y: windowState.y,
    minWidth: 900,
    minHeight: 600,
    title: 'LLM Wiki',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
    show: false,
    // On Windows/Linux `titleBarStyle: 'hiddenInset'` is treated as `default`
    // by Electron (it only hides on macOS), so the OS title bar would still
    // show up. Strip the entire OS chrome with `frame: false` and let the
    // React TopBar (with its own min/max/close buttons) take over. macOS
    // keeps `hiddenInset` so the traffic-light buttons remain clickable.
    ...(isMac
      ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 14, y: 12 } }
      : { frame: false }),
  };
  mainWindow = new BrowserWindow(winOpts);

  // Restore maximized
  if (windowState.isMaximized) mainWindow.maximize();

  // In dev mode, load the Vite dev server (HMR-aware) instead of the static
  // dist that uvicorn would serve. Vite proxies /api, /static and /health
  // to the FastAPI backend on PORT, so all endpoints keep working.
  const url = DEV_MODE ? `http://${HOST}:${VITE_PORT}` : `http://${HOST}:${PORT}`;
  mainWindow.loadURL(url);

  // Show offline page only for initial backend load failures
  let backendReady = false
  mainWindow.webContents.on('did-fail-load', (event, code, desc, url, isMainFrame) => {
    if (!backendReady && isMainFrame) {
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(OFFLINE_HTML)}`);
    }
  });

  // Return cleanup function for external use
  mainWindow._markBackendReady = () => { backendReady = true }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Save window state on move/resize
  ['resize', 'move'].forEach(ev => mainWindow.on(ev, () => { if (!mainWindow.isMaximized()) saveWindowState(mainWindow); }));
  mainWindow.on('maximize', () => saveWindowState(mainWindow));
  mainWindow.on('unmaximize', () => saveWindowState(mainWindow));

  // Minimize to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!isQuitting && tray) { e.preventDefault(); mainWindow.hide(); }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ---------------------------------------------------------------------------
// System Tray
// ---------------------------------------------------------------------------
function createTray() {
  // Use a simple 16x16 icon if available, otherwise skip tray
  const iconPath = path.join(__dirname, '..', 'static', 'icon.png');
  let icon;
  try { icon = require('electron').nativeImage.createFromPath(iconPath); } catch (_) {}
  if (!icon || icon.isEmpty()) {
    // Create a minimal icon programmatically (16x16 solid square)
    icon = require('electron').nativeImage.createEmpty();
  }

  tray = new Tray(icon.isEmpty() ? icon : icon.resize({ width: 16, height: 16 }));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show LLM Wiki', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } else createWindow(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; stopBackend(); stopVite(); app.quit(); } }
  ]);
  tray.setToolTip('LLM Wiki');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } else createWindow(); });
}

// ---------------------------------------------------------------------------
// Native Menu Bar
// ---------------------------------------------------------------------------
// We intentionally do NOT install a native application menu. The renderer draws
// its own themed top bar (see frontend/src/components/TopBar.tsx) and
// handles keyboard shortcuts in-process. The empty menu call below is kept
// to ensure no default menu appears on platforms that ship one.
function clearMenu() {
  Menu.setApplicationMenu(null);
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------
// App-level shortcuts are now handled in the renderer (see useKeyboardShortcuts
// in the frontend) so they participate in the custom top bar's focus model and
// are subject to the same OS-agnostic behavior. `globalShortcut` is intentionally
// left unused to avoid hijacking the user's OS-level hotkeys.
function registerShortcuts() {
  /* no-op */
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body, silent: false }).show();
  }
}

// ---------------------------------------------------------------------------
// Auto-updater (foundation — requires electron-updater pkg)
// ---------------------------------------------------------------------------
function setupAutoUpdater() {
  // Skip in dev mode — electron-updater is a production-only dependency.
  if (DEV_MODE) {
    console.log('[LLM Wiki] Auto-updater skipped (dev mode)');
    return;
  }
  try {
    const { autoUpdater } = require('electron-updater')
    if (!DEV_MODE) {
      autoUpdater.checkForUpdatesAndNotify()
      autoUpdater.on('update-available', () => showNotification('LLM Wiki', 'A new version is available!'))
      autoUpdater.on('update-downloaded', () => {
        showNotification('LLM Wiki', 'Update downloaded. Restart to apply.')
        dialog.showMessageBox(mainWindow, {
          title: 'Update Ready', message: 'A new version has been downloaded. Restart now to apply.',
          buttons: ['Restart Now', 'Later'], defaultId: 0,
        }).then(({ response }) => { if (response === 0) autoUpdater.quitAndInstall() })
      })
      autoUpdater.on('error', (err) => console.error('[LLM Wiki] Auto-updater error:', err.message))
      console.log('[LLM Wiki] Auto-updater enabled')
    }
  } catch (e) {
    console.log('[LLM Wiki] Auto-updater not available:', e.message)
  }
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------
function setupIPC() {
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => mainWindow?.[mainWindow.isMaximized() ? 'unmaximize' : 'maximize']());
  ipcMain.on('window:close', () => mainWindow?.close());

  // App-level actions invoked from the custom top bar / keyboard shortcuts.
  ipcMain.on('app:reload', () => mainWindow?.webContents.reload());
  ipcMain.on('app:toggle-devtools', () => mainWindow?.webContents.toggleDevTools());
  ipcMain.on('app:quit', () => { isQuitting = true; stopBackend(); stopVite(); app.quit(); });
  ipcMain.on('app:open-external', (_, url) => {
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      shell.openExternal(url);
    }
  });
  ipcMain.handle('app:show-about', () => {
    if (!mainWindow) return null;
    return dialog.showMessageBox(mainWindow, {
      title: 'About',
      message: 'LLM Wiki',
      detail: `Version ${app.getVersion()}\n\nLLM-powered structured knowledge base.`,
    });
  });

  ipcMain.handle('dialog:openFile', () => openFileDialog());
  ipcMain.handle('dialog:saveFile', async (_, content, defaultName) => {
    const result = await dialog.showSaveDialog(mainWindow, { defaultPath: defaultName || 'page.md', filters: [{ name: 'Markdown', extensions: ['md'] }] });
    if (!result.canceled) fs.writeFileSync(result.filePath, content, 'utf-8');
    return result.canceled ? null : result.filePath;
  });

  ipcMain.on('notify', (_, title, body) => showNotification(title, body));
}

async function openFileDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Markdown', extensions: ['md', 'txt'] }, { name: 'All Files', extensions: ['*'] }]
  });
  return result.canceled ? null : result.filePaths[0];
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); } else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    clearMenu();
    registerShortcuts();
    setupAutoUpdater();
    setupIPC();

    try { createTray(); } catch (e) { console.log('[LLM Wiki] Tray creation skipped:', e.message); }

    // In dev mode, start Vite first so HMR is live by the time the window
    // loads. In production the static `frontend/dist` is served by the
    // FastAPI backend itself (see app/main.py spa_fallback), so we skip it.
    if (DEV_MODE) {
      startVite();
      try {
        await waitForVite(`http://${HOST}:${VITE_PORT}/`);
        console.log('[LLM Wiki] Vite ready');
      } catch (err) {
        console.error(`[LLM Wiki] ${err.message}`);
        dialog.showErrorBox('Frontend Failed', `The Vite dev server could not be started.\n\n${err.message}\n\nMake sure the frontend dependencies are installed (cd frontend && npm install).`);
        app.quit();
        return;
      }
    }

    startBackend();

    // Show offline page while waiting
    createWindow();

    try {
      await waitForServer(`http://${HOST}:${PORT}/health`);
      console.log('[LLM Wiki] Backend ready');
      if (mainWindow) {
        mainWindow._markBackendReady?.();
        const url = DEV_MODE ? `http://${HOST}:${VITE_PORT}` : `http://${HOST}:${PORT}`;
        mainWindow.loadURL(url);
      }
    } catch (err) {
      console.error(`[LLM Wiki] ${err.message}`);
      dialog.showErrorBox('Backend Failed', `The backend server could not be started.\n\n${err.message}\n\nPlease check that Python 3.11+ and all dependencies are installed.`);
      app.quit();
      return;
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      else if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { stopBackend(); stopVite(); app.quit(); }
  });

  app.on('before-quit', () => {
    isQuitting = true;
    globalShortcut.unregisterAll();
    stopBackend();
    stopVite();
  });

  process.on('SIGINT', () => { stopBackend(); stopVite(); app.quit(); });
  process.on('SIGTERM', () => { stopBackend(); stopVite(); app.quit(); });
}
