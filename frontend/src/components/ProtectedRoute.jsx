import { useContext }  from 'react'
import { Navigate }    from 'react-router-dom'
import { AuthContext } from '../context/AuthContext.jsx'
import Loading         from './Loading.jsx'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useContext(AuthContext)

  if (loading) return <Loading />
  if (!user)   return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role))
    return <Navigate to="/" replace />

  return children
}
