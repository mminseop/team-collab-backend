import { Router } from "express";
import { handleSlackCommand } from "../controllers/slackController";

// Slack slash command 요청 받는 엔드포인트
const router = Router();

router.post("/slack/commands", handleSlackCommand);

export default router;
