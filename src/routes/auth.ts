import { Router } from "express";
import { login, logout, me, addUser } from "../controllers/authController";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();


router.post("/login", login);
router.post("/logout", logout);

// 인증 필요 라우트
router.get("/me", requireAuth, me);

// 관리자 전용 라우트
router.post("/users", requireAuth, requireAdmin, addUser);

export default router;
