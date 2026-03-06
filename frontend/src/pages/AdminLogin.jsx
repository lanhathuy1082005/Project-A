import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {handleAdminLogin} from "../api/login.js";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";

export default function AdminLogin() {
    const {user, setUser} = useContext(AuthContext);
    const [userData, setUserData] = useState({student_id: "", password: ""});
    const [message, setMessage] = useState("");

    const navigate = useNavigate();

    const handleChange = (e) => {
        setUserData({...userData, [e.target.name]: e.target.value});
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
    try {
        const data = await handleAdminLogin(userData);
        setUser(data.user);
        navigate("/");
    } catch (error) {
        setMessage(error.message);
    }
    };

    useEffect(() => {
        if (user) navigate("/");
    }, [user, navigate]);

return (

<>
    <h2>Admin Login Page</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Password:</label>
            <input
              type="password"
              name="password"
              onChange={handleChange}
            />
          </div>
          <p>{message}</p>
          <button type="submit">Login</button>
        </form>
      </>

);
}