import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import authRoutes from "./routes/auth";
import channelsRoutes from "./routes/channels";
import departmentRoutes from "./routes/departmentRoutes";
import slackCommandRoutes from "./routes/slack";
import userRoutes from "./routes/users";
import announcementRoutes from "./routes/announcements";

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
        "https://team-collab.minseop.dev",
        "http://swagger.minseop.dev",
        "https://swagger.minseop.dev",
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

// ==================== Swagger 설정 시작 ====================
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "TeamCollab API",
      version: "1.0.0",
      description: "TeamCollab API",
    },
    servers: [
      {
        url: "https://api.minseop.dev",
        description: "프로덕션 서버",
      },
      {
        url: "http://localhost:4000",
        description: "로컬 개발 서버",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./dist/routes/*.js"], // API 라우트 경로
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI 엔드포인트
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "TeamCollab API Docs",
    swaggerOptions: {
      persistAuthorization: true, // 인증 정보 유지
      withCredentials: true, // 쿠키 전송 활성화
    },
  })
);
// ==================== Swagger 설정 끝 ====================

// 헬스체크용 기본 라우트
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    deployedAt: new Date().toISOString(), // 배포 시간
  });
});

// Slack 요청을 위한 urlencoded 미들웨어 추가
app.use("/api/slack", express.urlencoded({ extended: true }));

// JSON 미들웨어 (다른 API용)
app.use(express.json({ limit: "10mb" }));

// 라우트
app.use("/api/auth", authRoutes);
app.use("/api/channels", channelsRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api", slackCommandRoutes);
app.use("/api/users", userRoutes);
app.use("/api/announcements", announcementRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Login: POST /api/auth/login`);
  console.log(`Profile: GET /api/auth/me`);
});
