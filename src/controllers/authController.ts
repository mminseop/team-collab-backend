import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { signAccessToken, JwtPayload } from "../utils/jwt";
import { UserModel } from "../models/User";
import db from "../config/db";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "이메일과 비밀번호를 입력하세요." });
    }

    // 사용자 조회
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "이메일 또는 비밀번호가 잘못되었습니다." });
    }

    // 비밀번호 검증
    const [rows] = await db.execute("SELECT password FROM Users WHERE id = ?", [user.id]);
    const hashedPassword = (rows as any[])[0]?.password;
    
    if (!hashedPassword) {
      return res.status(401).json({ error: "사용자 정보를 찾을 수 없습니다." });
    }

    const isPasswordValid = await bcrypt.compare(password, hashedPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "이메일 또는 비밀번호가 잘못되었습니다." });
    }

    // JWT 토큰 생성 및 나머지 로직은 동일...
    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    };

    const token = signAccessToken(tokenPayload);

    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await UserModel.updateLastLogin(user.id, req.ip || req.connection.remoteAddress || "");

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie("accessToken");
  res.json({ success: true, message: "로그아웃되었습니다." });
};

export const me = async (req: any, res: Response) => {
  res.json({
    success: true,
    user: req.user,
  });
};
