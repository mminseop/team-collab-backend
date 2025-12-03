import { Request, Response } from "express";
import { DepartmentModel } from "../models/Department";

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await DepartmentModel.findAll();

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error("GetDepartments error:", error);
    res.status(500).json({ success: false, error: "서버 오류가 발생했습니다." });
  }
};
