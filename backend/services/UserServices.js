import '../models/User.js'; 
import bcrypt from 'bcryptjs';

export const registerUser = async (username, email, password) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    await createUser(username, email, hashedPassword);
}

export const loginUser = async (email, password) => {
        const user = await getUserByEmail(email);
        if (user && await bcrypt.compare(password, user.password_hash)) {
            return user;
        } else {
            console.log('Invalid credentials');
        }
}
