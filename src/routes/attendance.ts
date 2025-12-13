import { Router } from "express";
import {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getMyAttendanceStats,
  getAllAttendance,
  getAllAttendanceStats,
} from "../controllers/attendanceController";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: 출/퇴근 API
 */

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
router.post("/checkin", requireAuth, checkIn);

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
router.post("/checkout", requireAuth, checkOut);

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
router.get("/today", requireAuth, getTodayAttendance);

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
router.get("/my", requireAuth, getMyAttendance);

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


// 관리자 API
/**
 * @swagger
 * /api/attendance/all:
 *   get:
 *     summary: 전체 팀원 출퇴근 기록 조회 (관리자)
 *     tags: [Attendance]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: 조회 월 (YYYY-MM)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, present, late, absent]
 *         description: 상태 필터
 *     responses:
 *       200:
 *         description: 기록 조회 성공
 */
router.get("/all", requireAuth, requireAdmin, getAllAttendance);

/**
 * @swagger
 * /api/attendance/all/stats:
 *   get:
 *     summary: 전체 출퇴근 통계 (관리자)
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
router.get("/all/stats", requireAuth, requireAdmin, getAllAttendanceStats);

export default router;
