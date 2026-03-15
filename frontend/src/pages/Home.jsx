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
        <div>
            {user && user.role === "admin" && <h2>Admin Home Page</h2>}
            {user && user.role === "student" && <h2>Student Home Page</h2>}
        </div>
    );
}