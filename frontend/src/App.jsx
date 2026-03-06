import { useContext } from "react";
import { AuthContext } from "./context/AuthContext.jsx";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import UserLogin from "./pages/UserLogin.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import History from "./pages/History.jsx";
import Loading from "./components/Loading.jsx";

function App() {
  const { loading } = useContext(AuthContext);

  if (loading) return <Loading />;

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/user-login" element={<UserLogin />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </Router>
  );
}

export default App;