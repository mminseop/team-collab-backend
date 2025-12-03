import { Router } from "express";
import { getDepartments } from "../controllers/departmentController";
import { requireAuth } from "../middlewares/auth"; // 필요 시

const router = Router();

// 인증라우트
router.get("/departments", requireAuth, getDepartments);

export default router;
