import { Router } from "express";
import { handleGitHubWebhook } from "../controllers/webhookController";

const router = Router();

/**
 * @route POST /api/webhook/github
 * @desc GitHub Webhook 수신
 */
router.post("/github", handleGitHubWebhook);

export default router;
