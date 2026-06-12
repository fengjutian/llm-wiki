import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Toast from './Toast'
import { useElectronMenu } from '../hooks/useElectronMenu'

export default function Layout() {
  useElectronMenu()

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <Outlet />
      </main>
      <Toast />
    </div>
  )
}
