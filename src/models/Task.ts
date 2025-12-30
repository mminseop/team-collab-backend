import db from "../config/db";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export interface Task {
  id: number;
  department_id: number;
  title: string;
  description: string;
  completed: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  // join 결과
  department_name?: string;
  department_display_name?: string;
  creator_name?: string;
}

export class TaskModel {
  // 부서별 할일 조회
  static async findByDepartment(departmentName: string): Promise<Task[]> {
    const [rows] = await db.execute<(Task & RowDataPacket)[]>(
      `SELECT 
        t.*,
        d.name as department_name,
        d.display_name as department_display_name,
        u.name as creator_name
       FROM Tasks t
       JOIN Departments d ON t.department_id = d.id
       JOIN Users u ON t.created_by = u.id
       WHERE d.name = ?
       ORDER BY t.created_at DESC`,
      [departmentName]
    );
    return rows;
  }

  // 모든 할일 조회 (부서별 그룹화)
  static async findAll(): Promise<Task[]> {
    const [rows] = await db.execute<(Task & RowDataPacket)[]>(
      `SELECT 
        t.*,
        d.name as department_name,
        d.display_name as department_display_name,
        u.name as creator_name
       FROM Tasks t
       JOIN Departments d ON t.department_id = d.id
       JOIN Users u ON t.created_by = u.id
       ORDER BY d.id, t.created_at DESC`
    );
    return rows;
  }

  // 할일 생성
  static async create(
    departmentName: string,
    title: string,
    description: string,
    createdBy: number
  ): Promise<number> {
    // 부서 ID 조회
    const [depts] = await db.execute<RowDataPacket[]>(
      "SELECT id FROM Departments WHERE name = ?",
      [departmentName]
    );

    if (depts.length === 0) {
      throw new Error("부서를 찾을 수 없습니다");
    }

    const departmentId = depts[0].id;

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO Tasks (department_id, title, description, created_by)
       VALUES (?, ?, ?, ?)`,
      [departmentId, title, description, createdBy]
    );

    return result.insertId;
  }

  // 할일 완료 상태 토글
  static async toggleComplete(taskId: number, userId: number): Promise<void> {
    await db.execute(
      `UPDATE Tasks 
       SET completed = NOT completed 
       WHERE id = ?`,
      [taskId]
    );
  }

  // 할일 수정
  static async update(
    taskId: number,
    title: string,
    description: string
  ): Promise<void> {
    await db.execute(
      `UPDATE Tasks 
       SET title = ?, description = ?
       WHERE id = ?`,
      [title, description, taskId]
    );
  }

  // 할일 삭제
  static async delete(taskId: number): Promise<void> {
    await db.execute("DELETE FROM Tasks WHERE id = ?", [taskId]);
  }

  // 부서 목록 조회
  static async getDepartments() {
    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT * FROM Departments ORDER BY id"
    );
    return rows;
  }
}
