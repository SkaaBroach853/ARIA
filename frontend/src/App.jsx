import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Chat from './pages/Chat'
import Dashboard from './pages/Dashboard'
import Threats from './pages/Threats'
import Timeline from './pages/Timeline'
import Logs from './pages/Logs'
import Report from './pages/Report'
import Admin from './pages/Admin'

function ProtectedRoute({ children, permission }) {
  const { user, loading, hasPermission } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen bg-bg text-[#6b7280]">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (permission && !hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg gap-3">
        <div className="text-[#ef4444] text-4xl">403</div>
        <div className="text-[#6b7280]">Your role ({user.role}) does not have access to this page.</div>
      </div>
    )
  }
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/chat" replace />} />
            <Route path="chat"      element={<ProtectedRoute permission="chat"><Chat /></ProtectedRoute>} />
            <Route path="dashboard" element={<ProtectedRoute permission="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="threats"   element={<ProtectedRoute permission="threats"><Threats /></ProtectedRoute>} />
            <Route path="timeline"  element={<ProtectedRoute permission="timeline"><Timeline /></ProtectedRoute>} />
            <Route path="logs"      element={<ProtectedRoute permission="logs"><Logs /></ProtectedRoute>} />
            <Route path="report"    element={<ProtectedRoute permission="report"><Report /></ProtectedRoute>} />
            <Route path="admin"     element={<ProtectedRoute permission="admin"><Admin /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
