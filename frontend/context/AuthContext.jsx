import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/auth/me')
      .then(r => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const r = await api.post('/auth/login', { username, password })
    setUser(r.data)
    return r.data
  }

  const logout = async () => {
    await api.post('/auth/logout')
    setUser(null)
  }

  const hasPermission = (perm) => {
    const map = {
      admin:   ['chat','dashboard','threats','timeline','logs','report','admin'],
      analyst: ['chat','dashboard','threats','timeline','logs','report'],
      manager: ['chat','dashboard','threats','report'],
      viewer:  ['dashboard','threats'],
    }
    return map[user?.role]?.includes(perm) ?? false
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
