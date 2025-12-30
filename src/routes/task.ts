import { Router } from "express";
import {
  getAllTasks,
  getTasksByDepartment,
  getDepartments,
  createTask,
  toggleTaskComplete,
  updateTask,
  deleteTask,
} from "../controllers/taskController";
import { requireAuth } from "../middlewares/auth";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: 팀별 할일 관리 API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "1"
 *         title:
 *           type: string
 *           example: "대시보드 UI 개선"
 *         description:
 *           type: string
 *           example: "사용자 피드백을 반영한 대시보드 UI 개선 작업"
 *         completed:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date
 *           example: "2025-12-15"
 *         createdBy:
 *           type: string
 *           example: "테스트"
 *     Department:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "1"
 *         name:
 *           type: string
 *           example: "frontend"
 *         displayName:
 *           type: string
 *           example: "프론트엔드팀"
 */

/**
 * @swagger
 * /api/tasks/departments:
 *   get:
 *     summary: 부서 목록 조회
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 부서 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 departments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Department'
 *       401:
 *         description: 인증 필요
 */
router.get("/departments", requireAuth, getDepartments);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: 전체 할일 조회 (부서별 그룹화)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 전체 할일 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 tasks:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/Task'
 *       401:
 *         description: 인증 필요
 */
router.get("/", requireAuth, getAllTasks);

/**
 * @swagger
 * /api/tasks/{department}:
 *   get:
 *     summary: 특정 부서 할일 조회
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: department
 *         required: true
 *         description: 부서 name (예: frontend, backend)
 *         schema:
 *           type: string
 *           example: frontend
 *     responses:
 *       200:
 *         description: 부서별 할일 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 department:
 *                   type: string
 *                   example: frontend
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *       401:
 *         description: 인증 필요
 */
router.get("/:department", requireAuth, getTasksByDepartment);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: 할일 생성
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - department
 *               - title
 *             properties:
 *               department:
 *                 type: string
 *                 description: 부서 name
 *                 example: frontend
 *               title:
 *                 type: string
 *                 example: "반응형 레이아웃 구현"
 *               description:
 *                 type: string
 *                 example: "모바일/태블릿 대응 반응형 레이아웃 작업"
 *     responses:
 *       201:
 *         description: 할일 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "할일이 생성되었습니다"
 *                 taskId:
 *                   type: number
 *                   example: 10
 *       400:
 *         description: 유효성 검사 실패
 *       401:
 *         description: 인증 필요
 */
router.post("/", requireAuth, createTask);

/**
 * @swagger
 * /api/tasks/{id}/toggle:
 *   patch:
 *     summary: 할일 완료 상태 토글
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 할일 ID
 *     responses:
 *       200:
 *         description: 상태 변경 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "할일 상태가 변경되었습니다"
 *       401:
 *         description: 인증 필요
 */
router.patch("/:id/toggle", requireAuth, toggleTaskComplete);

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: 할일 수정
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 할일 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: "API 성능 최적화"
 *               description:
 *                 type: string
 *                 example: "쿼리 최적화 및 캐싱 전략 정리"
 *     responses:
 *       200:
 *         description: 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "할일이 수정되었습니다"
 *       400:
 *         description: 유효성 검사 실패
 *       401:
 *         description: 인증 필요
 */
router.put("/:id", requireAuth, updateTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: 할일 삭제
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 할일 ID
 *     responses:
 *       200:
 *         description: 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "할일이 삭제되었습니다"
 *       401:
 *         description: 인증 필요
 */
router.delete("/:id", requireAuth, deleteTask);

export default router;
