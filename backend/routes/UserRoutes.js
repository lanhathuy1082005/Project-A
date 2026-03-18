import express from "express";
import {loginUser,logout,getCurrentUser} from "../controllers/UserControllers.js";
import { validateLogin } from "../middleware/UserValidator.js";

const router = express.Router();

//authentication routes
router.post("/user", validateLogin, loginUser);
router.post("/logout", logout);
router.get("/me", getCurrentUser);

export default router;

