import {getUserByStudentId,getAdminPasswordHash, getUserTruthByStudentId, createUser} from '../models/User.js'; 
import bcrypt from 'bcrypt';

export const loginAdminService = async (password) => {
    const hash = await getAdminPasswordHash();
    const isValid = await bcrypt.compare(password, hash);
    if (!isValid) {
        return null;
    }

    return {role: 'admin'};
}

export const loginUserService = async (student_id, password) => {
        const user = await getUserByStudentId(student_id);
        if (!user) {
            // simulate getting third party data 
            const truth = await getUserTruthByStudentId(student_id);
            if (!truth) {
                return null;
            }
            const newUser = await createUser(truth.student_id, await bcrypt.hash(password, 10)); 
            return newUser;
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return null;
        } 

        return {...user, role: 'student'};
}