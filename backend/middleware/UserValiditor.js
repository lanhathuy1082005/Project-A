const validateUser = (req, res, next) => {
    const { username, email, password } = req.body;

    if (!username || typeof username !== 'string' || username.length < 3) {
        return res.status(400).json({ error: 'Invalid username. It must be at least 3 characters long.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Invalid password. It must be at least 6 characters long.' });
    }
    next();
}

export default validateUser;