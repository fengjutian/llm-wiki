import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import StatusBar from './StatusBar'
import Toast from './Toast'
import TopBar from './TopBar'
import { useElectronMenu } from '../hooks/useElectronMenu'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

export default function Layout() {
  useElectronMenu()
  useKeyboardShortcuts()

  return (
    <div className="flex flex-col h-screen">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
          <Outlet />
        </main>
      </div>
      <StatusBar />
      <Toast />
    </div>
  )
}
