import express from "express";
import { login, refresh, me, logout } from "../controllers/authController.js";
import { loginLimiter, refreshLimiter } from "../middleware/rateLimiters.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", loginLimiter, login);
router.post("/refresh", refreshLimiter, refresh);
router.get("/me", authMiddleware, me);
router.post("/logout", authMiddleware, logout);

export default router;







