import { Router } from "express";
import { trackVisitor, getVisitorStats, getRecentVisitors } from "../controllers/analyticsController";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

/**
 * @route POST /api/analytics/track
 * @desc 방문자 IP 기록 (공개)
 */
router.post("/track", trackVisitor);

/**
 * @route GET /api/analytics/stats
 * @desc 방문 통계 조회 (관리자)
 */
router.get("/stats", requireAuth, requireAdmin, getVisitorStats);

/**
 * @route GET /api/analytics/visitors
 * @desc 최근 방문자 목록 (관리자)
 */
router.get("/visitors", requireAuth, requireAdmin, getRecentVisitors);

export default router;
