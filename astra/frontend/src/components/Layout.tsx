import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TitleBar from './TitleBar'
import NotificationCenter from './NotificationCenter'
import { useAppStore } from '../stores/appStore'

export default function Layout() {
  const { sidebarOpen } = useAppStore()

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar />}
        <main className="flex-1 overflow-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
      <NotificationCenter />
    </div>
  )
}

