import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";

export default function Home() {
    const {user} = useContext(AuthContext);

    return (
        <div>
            {user && user.role === "admin" && <h2>Admin Home Page</h2>}
            {user && user.role === "student" && <h2>Student Home Page</h2>}
        </div>
    );
}