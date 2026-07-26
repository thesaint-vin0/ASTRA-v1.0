import { Routes, Route, Navigate } from 'react-router-dom'
import { useThemeStore } from './stores/themeStore'
import { useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Login from './pages/Login'
import Settings from './pages/Settings'
import Memory from './pages/Memory'
import Models from './pages/Models'
import Files from './pages/Files'
import Plugins from './pages/Plugins'
import NotFound from './pages/NotFound'

function App() {
  const { theme } = useThemeStore()

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark', 'custom')
    document.documentElement.classList.add(theme)
  }, [theme])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="chat" element={<Chat />} />
        <Route path="chat/:conversationId" element={<Chat />} />
        <Route path="memory" element={<Memory />} />
        <Route path="models" element={<Models />} />
        <Route path="files" element={<Files />} />
        <Route path="plugins" element={<Plugins />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App

