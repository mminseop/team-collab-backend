import { Request, Response } from "express";
import { TaskModel } from "../models/Task";

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

// 부서별 할일 조회
export const getTasksByDepartment = async (req: Request, res: Response) => {
  try {
    const { department } = req.params;

    console.log("부서별 할일 조회:", department);

    const tasks = await TaskModel.findByDepartment(department);

    return res.status(200).json({
      success: true,
      department,
      tasks,
    });
  } catch (error: any) {
    console.error("할일 조회 실패:", error);
    return res.status(500).json({
      success: false,
      message: "할일 조회에 실패했습니다",
    });
  }
};

// 모든 할일 조회 (부서별 그룹화)
export const getAllTasks = async (req: Request, res: Response) => {
  try {
    console.log("전체 할일 조회");

    const allTasks = await TaskModel.findAll();

    // 부서별로 그룹화
    const tasksByDepartment: Record<string, any[]> = {};

    allTasks.forEach((task) => {
      const deptName = task.department_name || "unknown";
      if (!tasksByDepartment[deptName]) {
        tasksByDepartment[deptName] = [];
      }
      tasksByDepartment[deptName].push({
        id: task.id.toString(),
        title: task.title,
        description: task.description,
        completed: task.completed,
        createdAt: task.created_at.split("T")[0],
        createdBy: task.creator_name,
      });
    });

    return res.status(200).json({
      success: true,
      tasks: tasksByDepartment,
    });
  } catch (error: any) {
    console.error("전체 할일 조회 실패:", error);
    return res.status(500).json({
      success: false,
      message: "할일 조회에 실패했습니다",
    });
  }
};

// 부서 목록 조회
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await TaskModel.getDepartments();

    return res.status(200).json({
      success: true,
      departments: departments.map((dept) => ({
        id: dept.id.toString(),
        name: dept.name,
        displayName: dept.display_name,
      })),
    });
  } catch (error: any) {
    console.error("부서 목록 조회 실패:", error);
    return res.status(500).json({
      success: false,
      message: "부서 목록 조회에 실패했습니다",
    });
  }
};

// 할일 생성
export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const { department, title, description } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "인증이 필요합니다",
      });
    }

    if (!title || !department) {
      return res.status(400).json({
        success: false,
        message: "제목과 부서는 필수입니다",
      });
    }

    console.log("할일 생성:", { department, title, userId });

    const taskId = await TaskModel.create(
      department,
      title,
      description || "",
      userId
    );

    return res.status(201).json({
      success: true,
      message: "할일이 생성되었습니다",
      taskId,
    });
  } catch (error: any) {
    console.error("할일 생성 실패:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "할일 생성에 실패했습니다",
    });
  }
};

// 할일 완료 토글
export const toggleTaskComplete = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "인증이 필요합니다",
      });
    }

    console.log("할일 완료 토글:", { taskId: id, userId });

    await TaskModel.toggleComplete(parseInt(id), userId);

    return res.status(200).json({
      success: true,
      message: "할일 상태가 변경되었습니다",
    });
  } catch (error: any) {
    console.error("할일 토글 실패:", error);
    return res.status(500).json({
      success: false,
      message: "할일 상태 변경에 실패했습니다",
    });
  }
};

// 할일 수정
export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "인증이 필요합니다",
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "제목은 필수입니다",
      });
    }

    console.log("할일 수정:", { taskId: id, title });

    await TaskModel.update(parseInt(id), title, description || "");

    return res.status(200).json({
      success: true,
      message: "할일이 수정되었습니다",
    });
  } catch (error: any) {
    console.error("할일 수정 실패:", error);
    return res.status(500).json({
      success: false,
      message: "할일 수정에 실패했습니다",
    });
  }
};

// 할일 삭제
export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "인증이 필요합니다",
      });
    }

    console.log("할일 삭제:", { taskId: id, userId });

    await TaskModel.delete(parseInt(id));

    return res.status(200).json({
      success: true,
      message: "할일이 삭제되었습니다",
    });
  } catch (error: any) {
    console.error("할일 삭제 실패:", error);
    return res.status(500).json({
      success: false,
      message: "할일 삭제에 실패했습니다",
    });
  }
};
