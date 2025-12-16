import { Router } from "express";
import { handleGitHubWebhook } from "../controllers/webhookController";

const router = Router();

router.post("/github", handleGitHubWebhook);

export default router;
