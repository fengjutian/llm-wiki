const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const HOST = '127.0.0.1';
const PORT = 8080;
const DEV_MODE = !app.isPackaged;

// ---------------------------------------------------------------------------
// Python backend
// ---------------------------------------------------------------------------

let pythonProcess = null;

function findPython() {
  // In packaged mode, use bundled Python
  if (!DEV_MODE) {
    const bundled = process.platform === 'win32'
      ? path.join(process.resourcesPath, 'python-dist', 'python.exe')
      : path.join(process.resourcesPath, 'python-dist', 'bin', 'python3');
    return bundled;
  }
  // In dev mode, use Poetry's virtual environment Python
  const venvPath = process.platform === 'win32'
    ? path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'pypoetry', 'Cache', 'virtualenvs')
    : path.join(process.env.HOME || '', '.cache', 'pypoetry', 'virtualenvs');
  const fs = require('fs');
  if (fs.existsSync(venvPath)) {
    const dirs = fs.readdirSync(venvPath).filter(d => d.startsWith('llm-wiki-1-'));
    if (dirs.length > 0) {
      const pythonExe = process.platform === 'win32'
        ? path.join(venvPath, dirs[0], 'Scripts', 'python.exe')
        : path.join(venvPath, dirs[0], 'bin', 'python3');
      if (fs.existsSync(pythonExe)) {
        return pythonExe;
      }
    }
  }
  // Fallback to system python
  return 'python';
}

function startBackend() {
  const python = findPython();
  const args = ['-m', 'uvicorn', 'app.main:app', '--host', HOST, '--port', String(PORT), '--log-level', 'info'];

  console.log(`[LLM Wiki] Starting backend: ${python} ${args.join(' ')}`);

  pythonProcess = spawn(python, args, {
    cwd: DEV_MODE ? path.join(__dirname, '..') : process.resourcesPath,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python:err] ${data.toString().trim()}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`[LLM Wiki] Backend exited with code ${code}`);
    pythonProcess = null;
  });

  pythonProcess.on('error', (err) => {
    console.error(`[LLM Wiki] Failed to start backend: ${err.message}`);
    dialog.showErrorBox('启动失败', `无法启动 Python 后端:\n${err.message}\n\n请确认已安装 Python 3.11+ 及依赖 (poetry install)`);
    app.quit();
  });
}

function stopBackend() {
  if (pythonProcess) {
    console.log('[LLM Wiki] Stopping backend...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(pythonProcess.pid), '/f', '/t']);
    } else {
      pythonProcess.kill('SIGTERM');
    }
    pythonProcess = null;
  }
}

function waitForServer(url, retries = 30, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    function check() {
      attempts++;
      http.get(url, (res) => {
        resolve(true);
      }).on('error', () => {
        if (attempts >= retries) {
          reject(new Error(`Server at ${url} did not start within ${retries * interval}ms`));
        } else {
          setTimeout(check, interval);
        }
      });
    }
    check();
  });
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'LLM Wiki',
    icon: path.join(__dirname, '..', 'static', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false, // show after ready-to-show
  });

  mainWindow.loadURL(`http://${HOST}:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.close());

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown', extensions: ['md', 'txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return result.canceled ? null : result.filePaths[0];
});

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(async () => {
  startBackend();

  try {
    await waitForServer(`http://${HOST}:${PORT}/health`);
    console.log('[LLM Wiki] Backend is ready');
    createWindow();
  } catch (err) {
    console.error(`[LLM Wiki] ${err.message}`);
    dialog.showErrorBox('启动超时', `后端服务未能启动:\n${err.message}`);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackend();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  stopBackend();
  app.quit();
});

process.on('SIGTERM', () => {
  stopBackend();
  app.quit();
});
