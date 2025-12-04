import { Router } from "express";
import { login, logout, me, addUser } from "../controllers/authController";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: 인증 및 사용자 관리 API
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 로그인
 *     description: 이메일과 비밀번호로 로그인하고 JWT 토큰을 쿠키로 발급받습니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 사용자 이메일
 *                 example: admin@teamcollab.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 사용자 비밀번호
 *                 example: password123
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=None; Max-Age=604800
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 12
 *                     email:
 *                       type: string
 *                       example: admin@teamcollab.com
 *                     name:
 *                       type: string
 *                       example: 관리자
 *                     role:
 *                       type: string
 *                       example: ADMIN
 *                     departmentId:
 *                       type: integer
 *                       nullable: true
 *                       example: 1
 *       400:
 *         description: 필수 필드 누락
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 이메일과 비밀번호를 입력하세요.
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 이메일 또는 비밀번호가 잘못되었습니다.
 */
router.post("/login", login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 로그아웃
 *     description: 쿠키를 삭제하여 로그아웃합니다.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 로그아웃 성공
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
 *                   example: 로그아웃되었습니다.
 */
router.post("/logout", logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 현재 사용자 정보 조회
 *     description: 로그인된 사용자의 상세 정보를 조회합니다 (인증 필요)
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: 사용자 ID
 *                       example: 12
 *                     email:
 *                       type: string
 *                       description: 이메일
 *                       example: admin@teamcollab.com
 *                     name:
 *                       type: string
 *                       description: 사용자 이름
 *                       example: 관리자
 *                     role:
 *                       type: string
 *                       description: 사용자 역할
 *                       example: ADMIN
 *                     departmentId:
 *                       type: integer
 *                       nullable: true
 *                       description: 소속 부서 ID
 *                       example: 1
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: 인증이 필요합니다.
 *       404:
 *         description: 사용자를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: 사용자를 찾을 수 없습니다.
 */
router.get("/me", requireAuth, me);

/**
 * @swagger
 * /api/auth/users:
 *   post:
 *     summary: 신규 사용자 추가 (관리자 전용)
 *     description: 관리자가 신규 사용자를 등록합니다 (인증 + 관리자 권한 필요)
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - role_id
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 신규 사용자 이메일
 *                 example: newuser@teamcollab.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 신규 사용자 비밀번호
 *                 example: password123
 *               name:
 *                 type: string
 *                 description: 사용자 이름
 *                 example: 홍길동
 *               department_id:
 *                 type: integer
 *                 nullable: true
 *                 description: 소속 부서 ID (선택)
 *                 example: 1
 *               role_id:
 *                 type: integer
 *                 description: 역할 ID (1=ADMIN, 2=MEMBER)
 *                 example: 2
 *     responses:
 *       201:
 *         description: 사용자 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 15
 *                     email:
 *                       type: string
 *                       example: newuser@teamcollab.com
 *                     name:
 *                       type: string
 *                       example: 홍길동
 *                     department_id:
 *                       type: integer
 *                       nullable: true
 *                       example: 1
 *                     role_id:
 *                       type: integer
 *                       example: 2
 *                     is_active:
 *                       type: string
 *                       example: Y
 *       400:
 *         description: 필수 필드 누락
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 필수 필드를 모두 입력하세요.
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 *       409:
 *         description: 이메일 중복
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 이미 존재하는 이메일입니다.
 */
router.post("/users", requireAuth, requireAdmin, addUser);

export default router;
