import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Toast from './Toast'
import { useElectronMenu } from '../hooks/useElectronMenu'

export default function Layout() {
  useElectronMenu()

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
      <Toast />
    </div>
  )
}
