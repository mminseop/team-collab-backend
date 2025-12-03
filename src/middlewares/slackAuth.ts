import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export interface SlackRequest extends Request {
  rawBody?: Buffer;
}

export const verifySlackRequest = (
  req: SlackRequest,
  res: Response,
  next: NextFunction
) => {
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
  
  if (!slackSigningSecret) {
    console.error("SLACK_SIGNING_SECRET 환경변수가 설정되지 않았습니다.");
    return res.status(500).json({ error: "서버 설정 오류" });
  }

  // Slack 요청 헤더 확인
  const timestamp = req.headers["x-slack-request-timestamp"] as string;
  const signature = req.headers["x-slack-signature"] as string;

  if (!timestamp || !signature) {
    return res.status(400).json({ 
      text: "Slack 요청 형식이 올바르지 않습니다.",
      response_type: "ephemeral"
    });
  }

  // Replay 공격 방지 (5분 이내 요청만 허용)
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (Number(timestamp) < fiveMinutesAgo) {
    return res.status(400).json({ 
      text: "요청이 만료되었습니다.",
      response_type: "ephemeral"
    });
  }

  // 요청 본문이 Buffer로 저장되어 있는지 확인
  if (!req.rawBody) {
    return res.status(400).json({ 
      text: "요청 데이터 처리 오류",
      response_type: "ephemeral"
    });
  }

  // Slack 서명 검증
  const baseString = `v0:${timestamp}:${req.rawBody.toString("utf8")}`;
  const mySignature = "v0=" + crypto
    .createHmac("sha256", slackSigningSecret)
    .update(baseString)
    .digest("hex");

  if (!crypto.timingSafeEqual(
    Buffer.from(mySignature), 
    Buffer.from(signature)
  )) {
    console.error("Slack 서명 검증 실패");
    return res.status(401).json({ 
      text: "요청 검증 실패",
      response_type: "ephemeral"
    });
  }

  next();
};
