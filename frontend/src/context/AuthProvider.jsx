import { useEffect, useState } from 'react'
import { AuthContext }          from './AuthContext.jsx'
import { fetchCurrentUser }     from '../api/auth.api.js'

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCurrentUser()
      .then(data => setUser(data.user))
      .catch(() => setUser(null))          // 401 = not logged in, not an error
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
