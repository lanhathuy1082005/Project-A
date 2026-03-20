import { useContext } from "react";
import { AuthContext } from "./context/AuthContext.jsx";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import UserLogin from "./pages/UserLogin.jsx";
import History from "./pages/History.jsx";
import Item from "./pages/Item.jsx";
import Loading from "./components/Loading.jsx";

function App() {
  const { loading, user } = useContext(AuthContext);

  if (loading) return <Loading />;

  return (
    <Router>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {user && <Navbar />}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/user-login" element={<UserLogin />} />
            <Route path="/history" element={<History />} />
            <Route path="/items" element={<Item />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;