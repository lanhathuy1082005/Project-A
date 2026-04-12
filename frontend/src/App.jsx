import { useContext }                         from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthContext }                        from './context/AuthContext.jsx'
import ProtectedRoute                         from './components/ProtectedRoute.jsx'
import Navbar                                 from './components/Navbar.jsx'
import Loading                                from './components/Loading.jsx'
import Home                                   from './pages/Home.jsx'
import Login                                  from './pages/Login.jsx'
import Items                                  from './pages/Items.jsx'
import History                                from './pages/History.jsx'
import Face                                   from './pages/Face.jsx'

// Admin pages
import Dashboard       from './pages/admin/Dashboard.jsx'
import ClassManagement from './pages/admin/ClassManagement.jsx'
import Inventory       from './pages/admin/Inventory.jsx'
import Reservations    from './pages/admin/Reservations.jsx'
import LabChecklist    from './pages/admin/LabChecklist.jsx'
import FeedbackList    from './pages/admin/FeedbackList.jsx'

function App() {
  const { loading } = useContext(AuthContext)
  if (loading) return <Loading text="Loading..." />

  return (
    <Router>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Navbar />
        <div style={{ flex: 1, overflowY: 'auto', height: '100vh' }}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/face"  element={<Face />} />

            {/* Protected — any logged-in user */}
            <Route path="/" element={
              <ProtectedRoute><Home /></ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute allowedRoles={['student', 'admin']}><History /></ProtectedRoute>
            } />

            {/* Protected — student only */}
            <Route path="/items" element={
              <ProtectedRoute allowedRoles={['student']}><Items /></ProtectedRoute>
            } />

            {/* Protected — admin only */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>
            } />
            <Route path="/admin/classes" element={
              <ProtectedRoute allowedRoles={['admin']}><ClassManagement /></ProtectedRoute>
            } />
            <Route path="/admin/inventory" element={
              <ProtectedRoute allowedRoles={['admin']}><Inventory /></ProtectedRoute>
            } />
            <Route path="/admin/reservations" element={
              <ProtectedRoute allowedRoles={['admin']}><Reservations /></ProtectedRoute>
            } />
            <Route path="/admin/checklist" element={
              <ProtectedRoute allowedRoles={['admin']}><LabChecklist /></ProtectedRoute>
            } />
            <Route path="/admin/feedback" element={
              <ProtectedRoute allowedRoles={['admin']}><FeedbackList /></ProtectedRoute>
            } />

            {/* 404 */}
            <Route path="*" element={<h1 style={{ padding: '24px' }}>404 - Not Found</h1>} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
