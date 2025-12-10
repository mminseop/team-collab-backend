import { Request, Response, NextFunction } from "express";

export interface SlackRequest extends Request {
  rawBody?: string;
}

export const verifySlackRequest = (
  req: SlackRequest,
  res: Response,
  next: NextFunction
) => {
  // 임시 모든 요청 통과 (개발용)
  console.log("Slack 검증 스킵 (개발 모드)");
  return next();
};
