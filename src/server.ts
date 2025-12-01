import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import channelsRoutes from "./routes/channels";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// 미들웨어
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://team-collab-app-ruby.vercel.app", // 버셀주소
        ...(process.env.FRONTEND_URL || "").split(","),
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

// 헬스체크용 기본 라우트
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    deployedAt: new Date().toISOString(), // 배포 시간
  });
});

// 라우트
app.use("/api/auth", authRoutes);
app.use("/api/channels", channelsRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Login: POST /api/auth/login`);
  console.log(`Profile: GET /api/auth/me`);
});
