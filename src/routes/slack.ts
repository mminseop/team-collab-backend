import { Router } from "express";
import { handleSlackCommand } from "../controllers/slackController";
import { verifySlackRequest } from "../middlewares/slackAuth";

const router = Router();

router.post("/command", verifySlackRequest, handleSlackCommand);

export default router;
