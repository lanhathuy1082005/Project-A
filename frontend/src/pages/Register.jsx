import handleRegister from "../api/register";
import { Link } from "react-router-dom";

export default function Register() {
    return (
        <div>
            <h2>Register Page</h2>
            <form>
                <div>
                    <label>Name:</label>
                    <input type="text" name="name" required />
                </div>
                <div>
                    <label>Email:</label>
                    <input type="email" name="email" required />
                </div>
                <div>
                    <label>Password:</label>
                    <input type="password" name="password" required />
                </div>
                <button type="submit" onClick={handleRegister}>Register</button>
                <Link to="/login">Login</Link>
            </form>
        </div>
    );
}