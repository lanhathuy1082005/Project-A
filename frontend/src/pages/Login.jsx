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
                <button type="submit">Login</button>
                <a href="/register">Register</a>
            </form>
        </div>
    );
}