import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { UserModel } from "../models/User";
import db from "../config/db";

// 신규 사용자 등록 (관리자 전용)
export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name, department_id, role_id } = req.body;

    // 필수 값 확인
    if (!email || !password || !name || !role_id) {
      return res.status(400).json({ error: "필수 필드를 모두 입력하세요." });
    }

    // 이메일 중복 체크
    const [existingUsers] = await db.execute(
      "SELECT id FROM Users WHERE email = ?",
      [email]
    );

    if ((existingUsers as any[]).length > 0) {
      return res.status(409).json({ error: "이미 존재하는 이메일입니다." });
    }

    // 비밀번호 해시 생성
    const hashedPassword = await bcrypt.hash(password, 10);

    // 신규 유저 DB 등록
    const [result] = await db.execute(
      `INSERT INTO Users (email, password, name, department_id, role_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'Y', NOW(), NOW())`,
      [email, hashedPassword, name, department_id || null, role_id]
    );

    const insertId = (result as any).insertId;

    res.status(201).json({
      success: true,
      user: {
        id: insertId,
        email,
        name,
        department_id,
        role_id,
        is_active: "Y",
      },
    });
  } catch (error) {
    console.error("CreateUser error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

// 사용자 목록 조회 (관리자 전용)
export const getUsers = async (req: Request, res: Response) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.email, u.name, u.department_id, u.is_active, 
              u.last_login, r.name as role, d.display_name as department_name
       FROM Users u
       LEFT JOIN Roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.is_active = 'Y'
       ORDER BY u.created_at DESC`
    );

    res.json({
      success: true,
      users: rows,
    });
  } catch (error) {
    console.error("GetUsers error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

// 특정 사용자 조회
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findById(Number(id));

    if (!user) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("GetUserById error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

// 내 정보 수정 (본인만)
export const updateMyProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { name, password } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (name) {
      updates.push("name = ?");
      values.push(name);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push("password = ?");
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "수정할 정보를 입력하세요." });
    }

    updates.push("updated_at = NOW()");
    values.push(userId);

    await db.execute(
      `UPDATE Users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    const user = await UserModel.findById(userId);

    res.json({
      success: true,
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        role: user?.role,
        departmentId: user?.departmentId,
      },
    });
  } catch (error) {
    console.error("UpdateMyProfile error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

// 사용자 정보 수정 (관리자)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, department_id, role_id, is_active } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (name) {
      updates.push("name = ?");
      values.push(name);
    }

    if (department_id !== undefined) {
      updates.push("department_id = ?");
      values.push(department_id);
    }

    if (role_id) {
      updates.push("role_id = ?");
      values.push(role_id);
    }

    if (is_active) {
      updates.push("is_active = ?");
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "수정할 정보를 입력하세요." });
    }

    updates.push("updated_at = NOW()");
    values.push(id);

    await db.execute(
      `UPDATE Users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: "사용자 정보가 수정되었습니다.",
    });
  } catch (error) {
    console.error("UpdateUser error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

// 사용자 삭제 (관리자)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Soft delete (is_active = 'N')
    await db.execute(
      `UPDATE Users SET is_active = 'N', updated_at = NOW() WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "사용자가 삭제되었습니다.",
    });
  } catch (error) {
    console.error("DeleteUser error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};
