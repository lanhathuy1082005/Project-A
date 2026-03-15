import express from "express";
import {loginUser,logout,getCurrentUser} from "../controllers/UserControllers.js";

const router = express.Router();

//authentication routes
router.post("/user", loginUser);
router.post("/logout", logout);
router.get("/me", getCurrentUser);

export default router;
