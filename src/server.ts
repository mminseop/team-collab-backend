import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// 공통 미들웨어
app.use(cors());
app.use(express.json());

// 헬스체크용 기본 라우트
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    deployedAt: new Date().toISOString(), // 배포 시간
    version: "v1.0.1-ci-cd-test", // 버전 표시
    environment: process.env.NODE_ENV || "development",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
