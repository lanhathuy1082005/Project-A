import { useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

export default function Home() {
    const {user} = useContext(AuthContext);
    const navigate = useNavigate();
    useEffect(() => {
        if (!user) {
        navigate("/user-login");
        return;
        }
    }, [user, navigate]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 64px' }}>
            <div>
                <h1 style={{ fontSize: '3.2rem', fontWeight: '800', marginBottom: '24px' }}>
                    Hello, {user?.user_id}!
                </h1>
                <p style={{ fontSize: '1.3rem', lineHeight: '1.8', color: '#222' }}>
                    Welcome to the Asia Vietnam Lab Management System.<br />
                    From here you can manage your classes, borrow lab equipment, and track your borrowing history.
                </p>
            </div>
        </div>
    );
}