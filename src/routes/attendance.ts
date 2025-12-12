import { Router } from "express";
import {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getMyAttendanceStats,
} from "../controllers/attendanceController";
import { requireAuth } from "../middlewares/auth";

const router = Router();

/**
 * @swagger
 * /api/attendance/checkin:
 *   post:
 *     summary: 출근 기록
 *     tags: [Attendance]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 출근 성공
 */
router.post("/checkin", requireAuth, checkIn); // ✅ 수정

/**
 * @swagger
 * /api/attendance/checkout:
 *   post:
 *     summary: 퇴근 기록
 *     tags: [Attendance]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 퇴근 성공
 */
router.post("/checkout", requireAuth, checkOut); // ✅ 수정

/**
 * @swagger
 * /api/attendance/today:
 *   get:
 *     summary: 오늘 출퇴근 현황 조회
 *     tags: [Attendance]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 현황 조회 성공
 */
router.get("/today", requireAuth, getTodayAttendance); // ✅ 수정

/**
 * @swagger
 * /api/attendance/my:
 *   get:
 *     summary: 내 출퇴근 기록 조회 (월별)
 *     tags: [Attendance]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: 조회 월 (YYYY-MM)
 *     responses:
 *       200:
 *         description: 기록 조회 성공
 */
router.get("/my", requireAuth, getMyAttendance); // ✅ 수정

/**
 * @swagger
 * /api/attendance/my/stats:
 *   get:
 *     summary: 내 출퇴근 통계 (월별)
 *     tags: [Attendance]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: 조회 월 (YYYY-MM)
 *     responses:
 *       200:
 *         description: 통계 조회 성공
 */
router.get("/my/stats", requireAuth, getMyAttendanceStats);

export default router;
