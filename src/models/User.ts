import db from "../config/db";

export interface User {
  id: number;
  email: string;
  name: string;
  departmentId: number | null;
  role: "ADMIN" | "MEMBER";
  isActive: "Y" | "N";
  loginIp?: string;
  lastLogin?: string;
}

export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    const [rows] = await db.execute(
      `SELECT u.id, u.email, u.password, u.name, u.department_id, u.is_active, u.login_ip, u.last_login,
              r.name as role
       FROM Users u
       JOIN Roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email]
    );

    const row = (rows as any[])[0];
    if (!row || row.is_active !== "Y") return null;

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      departmentId: row.department_id,
      role: row.role as "ADMIN" | "MEMBER",
      isActive: row.is_active,
      loginIp: row.login_ip,
      lastLogin: row.last_login,
    };
  }

  static async findById(id: number): Promise<User | null> {
    const [rows] = await db.execute(
      `SELECT u.id, u.email, u.name, u.department_id, u.is_active, 
              r.name as role
       FROM Users u
       JOIN Roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [id]
    );

    const row = (rows as any[])[0];
    if (!row || row.is_active !== "Y") return null;

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      departmentId: row.department_id,
      role: row.role as "ADMIN" | "MEMBER",
      isActive: row.is_active,
      loginIp: row.login_ip,
      lastLogin: row.last_login,
    };
  }

  static async updateLastLogin(userId: number, ip: string) {
    await db.execute(
      "UPDATE Users SET login_ip = ?, last_login = NOW() WHERE id = ?",
      [ip, userId]
    );
  }
}
