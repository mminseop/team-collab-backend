import { Router } from "express";
import { createAnnouncement, getAnnouncements } from "../controllers/announcementController";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Announcements
 *   description: 공지사항 API
 */

/**
 * @swagger
 * /api/announcements:
 *   post:
 *     summary: 공지사항 작성 (관리자)
 *     tags: [Announcements]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               channel_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: 공지사항 작성 성공
 */
router.post("/", requireAuth, requireAdmin, createAnnouncement);

/**
 * @swagger
 * /api/announcements:
 *   get:
 *     summary: 공지사항 목록 조회
 *     tags: [Announcements]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 공지사항 목록
 */
router.get("/", requireAuth, getAnnouncements);

export default router;
