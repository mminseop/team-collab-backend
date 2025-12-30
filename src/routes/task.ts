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
 * @route GET /api/tasks/departments
 * @desc 부서 목록 조회
 */
router.get("/departments", requireAuth, getDepartments);

/**
 * @route GET /api/tasks
 * @desc 전체 할일 조회 (부서별 그룹화)
 */
router.get("/", requireAuth, getAllTasks);

/**
 * @route GET /api/tasks/:department
 * @desc 특정 부서 할일 조회
 */
router.get("/:department", requireAuth, getTasksByDepartment);

/**
 * @route POST /api/tasks
 * @desc 할일 생성
 */
router.post("/", requireAuth, createTask);

/**
 * @route PATCH /api/tasks/:id/toggle
 * @desc 할일 완료 토글
 */
router.patch("/:id/toggle", requireAuth, toggleTaskComplete);

/**
 * @route PUT /api/tasks/:id
 * @desc 할일 수정
 */
router.put("/:id", requireAuth, updateTask);

/**
 * @route DELETE /api/tasks/:id
 * @desc 할일 삭제
 */
router.delete("/:id", requireAuth, deleteTask);

export default router;
