import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Footer from './components/Footer.jsx'
import BorrowReturn from './pages/BorrowReturn.jsx'
import Navbar from './components/Navbar.jsx'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function App() {

  return (
    <>
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/borrow-return" element={<BorrowReturn />} />
      </Routes>
      <Footer />
    </Router>
    </>
  )
}

export default App
