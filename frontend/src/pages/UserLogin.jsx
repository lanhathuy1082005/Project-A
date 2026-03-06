import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {handleUserLogin} from "../api/login.js";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";

export default function UserLogin() {
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
            const data = await handleUserLogin(userData);
            setUser(data.user);
            navigate("/");
        } catch (error) {
            setMessage(error.message);
        }
}

    useEffect(() => {
        if (user) navigate("/");
    }, [user, navigate]);

    return (
        <>

                <h2>User Login Page</h2>
                    <form onSubmit={handleSubmit}>
                        <div>
                            <label>Student Id:</label>
                            <input type="text" name="student_id" onChange={handleChange}/>
                        </div>
                        <div>
                            <label>Password:</label>
                            <input type="text" name="password" onChange={handleChange}/>
                        </div>
                        <p>{message}</p>
                        <button type="submit">Login</button>
                    </form>

    </>
    );
}