import {getUserByUserId, getUserTruthByUserId, createUser} from '../models/User.js'; 
import bcrypt from 'bcrypt';

export const loginUserService = async (user_id, password) => {
        const user = await getUserByUserId(user_id);
        if (!user) {
            // simulate getting third party data 
            const truth = await getUserTruthByUserId(user_id);
            if (!truth) {
                return null;
            }
            const newUser = await createUser(truth.user_id, await bcrypt.hash(password, 10)); 

            return {id: newUser.id, user_id: newUser.user_id, role: newUser.role};
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return null;
        }

        return {id: user.id, user_id: user.user_id, role: user.role};
}