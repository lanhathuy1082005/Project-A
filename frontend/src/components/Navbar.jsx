import {NavLink} from "react-router-dom";

export default function Navbar() {
    return (
        <>
            <nav>
                <NavLink to="/">Home</NavLink>
                <NavLink to="/assets">Assets</NavLink>
                <NavLink to="/borrow-return">Borrow/Return</NavLink>
                <NavLink to="/history">History</NavLink> 
                <NavLink to="/payment">Make a payment</NavLink>
                <NavLink to="/support">Support</NavLink>   

                <div className="auth-links">
                <NavLink to="/login">Login</NavLink>
                <NavLink to="/register">Register</NavLink>
                </div>
            </nav>
        </>
    );
}
