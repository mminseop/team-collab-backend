import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export const verifySlackRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;

  if (!slackSigningSecret) {
    console.log("SLACK_SIGNING_SECRET이 설정되지 않았습니다.");
    return next(); // 개발 환경에서는 통과
  }

  const slackSignature = req.headers["x-slack-signature"] as string;
  const slackTimestamp = req.headers["x-slack-request-timestamp"] as string;

  if (!slackSignature || !slackTimestamp) {
    return res.status(400).json({ error: "Invalid Slack request" });
  }

  // 5분 이상 된 요청 거부 (Replay Attack 방지)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(slackTimestamp)) > 300) {
    return res.status(400).json({ error: "Request timestamp too old" });
  }

  // 서명 검증
  const sigBasestring = `v0:${slackTimestamp}:${JSON.stringify(req.body)}`;
  const mySignature =
    "v0=" +
    crypto
      .createHmac("sha256", slackSigningSecret)
      .update(sigBasestring)
      .digest("hex");

  if (
    crypto.timingSafeEqual(
      Buffer.from(mySignature),
      Buffer.from(slackSignature)
    )
  ) {
    return next();
  } else {
    return res.status(403).json({ error: "Invalid Slack signature" });
  }
};
