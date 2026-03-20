import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {handleUserLogin} from "../api/login.js";
import { TbBox } from "react-icons/tb";
import { AuthContext } from "../context/AuthContext.jsx";

export default function UserLogin() {
    const {user, setUser} = useContext(AuthContext);
    const [userData, setUserData] = useState({user_id: "", password: ""});
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f3f4f6' }}>

            {/* Top navbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#000', padding: '14px 24px' }}>
                <div style={{ width: '40px', height: '40px', border: '2px solid #fff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TbBox size={24} color="white" />
                </div>
                <span style={{ color: '#fff', fontWeight: '700', fontSize: '1.1rem' }}>Asia Vietnam lab management system</span>
            </div>

            {/* Center card */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ backgroundColor: '#111', borderRadius: '24px', padding: '40px 36px', width: '100%', maxWidth: '320px' }}>
                    <h2 style={{ color: '#fff', textAlign: 'center', fontSize: '1.8rem', fontWeight: '700', marginBottom: '32px' }}>Login</h2>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '8px' }}>
                            <input
                                type="text"
                                name="user_id"
                                placeholder="SWH00000"
                                onChange={handleChange}
                                style={{ width: '100%', padding: '14px 18px', borderRadius: '999px', border: 'none', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                            />
                            <p style={{ color: '#9ca3af', fontSize: '0.8rem', textAlign: 'right', marginTop: '4px', marginBottom: '12px' }}>Enter Student ID</p>
                        </div>

                        <div style={{ marginBottom: '8px' }}>
                            <input
                                type="password"
                                name="password"
                                placeholder="••••••••••"
                                onChange={handleChange}
                                style={{ width: '100%', padding: '14px 18px', borderRadius: '999px', border: 'none', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                            />
                            <p style={{ color: '#9ca3af', fontSize: '0.8rem', textAlign: 'right', marginTop: '4px', marginBottom: '24px' }}>Enter Password</p>
                        </div>

                        {message && <p style={{ color: '#f87171', textAlign: 'center', marginBottom: '12px', fontSize: '0.9rem' }}>{message}</p>}

                        <button
                            type="submit"
                            style={{ width: '100%', padding: '15px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '999px', fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}