import handleLogin from "../api/login.js";
import { Link } from "react-router-dom";

export default function Login() {
    return (
        <div>
            <h2>Login Page</h2>
            <form>
                <div>
                    <label>Email:</label>
                    <input type="email" name="email" required />
                </div>
                <div>
                    <label>Password:</label>    
                    <input type="password" name="password" required />
                </div>
                <button type="submit" onClick={handleLogin}>Login</button>
                <Link to="/register">Register</Link>
            </form>
        </div>
    );
}