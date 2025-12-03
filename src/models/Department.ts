import db from "../config/db";

export interface Department {
  id: number;
  name: string;
  display_name: string;
}

export class DepartmentModel {
  static async findAll(): Promise<Department[]> {
    const [rows] = await db.execute(
      "SELECT id, name, display_name FROM Departments ORDER BY id ASC"
    ) as [Department[], any[]];

    return rows;
  }
}
