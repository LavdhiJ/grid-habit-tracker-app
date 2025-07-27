import express from "express";
import { getCurrentUser, loginUser, registerUser , logoutUser } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get('/me', verifyJWT, getCurrentUser); 
router.post('/logout',verifyJWT , logoutUser);
export default router;
