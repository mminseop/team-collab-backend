import { Request, Response } from "express";
import { ChannelModel } from "../models/Channel";
import { UserModel } from "../models/User";
import db from "../config/db";

interface SlackCommand {
  text: string;
  user_name: string;
  channel_name: string;
  user_id: string; // Slack user ID
  response_url?: string;
}

export const handleSlackCommand = async (req: Request, res: Response) => {
  try {
    const { text, user_name, channel_name, user_id } = req.body as SlackCommand;

    const channel = await ChannelModel.findBySlackChannel(`#${channel_name}`);
    if (!channel) {
      return res.json({
        text: "Slack 채널이 TeamCollab과 연동되지 않았습니다.",
        response_type: "ephemeral",
      });
    }

    const [command, ...argsParts] = text.trim().split(/\s+/);
    const args = argsParts.join(" ");

    let response: any = {};

    switch (command.toLowerCase()) {
      case "/공지":
      case "/announcement":
        if (!args || !args.trim()) {
          response = {
            text: "❌ 공지 내용을 입력해주세요.\n\n사용법: `/공지 [내용]`",
            response_type: "ephemeral",
          };
          break;
        }

        // Slack > DB 저장 (content만 사용)
        try {
          const [result] = await db.execute(
            `INSERT INTO Announcements (content, author_id, channel_id, created_at)
             VALUES (?, (SELECT id FROM Users WHERE slack_user_id = ? LIMIT 1), ?, NOW())`,
            [args.trim(), user_id, channel.id]
          );

          response = {
            text: `공지사항이 TeamCollab 대시보드에 저장되었습니다!\n\n${args}`,
            response_type: "in_channel",
          };
        } catch (dbError) {
          console.error("DB 저장 실패:", dbError);
          response = {
            text: "공지사항 저장 중 오류가 발생했습니다.",
            response_type: "ephemeral",
          };
        }
        break;

      case "/팀원목록":
        const teamMembers = await UserModel.findActiveTeamMembers();
        const membersList = teamMembers
          .map((m) => `• ${m.name} (${m.email})`)
          .join("\n");

        response = {
          text: `*현재 팀원 목록*\n\n${membersList || "등록된 팀원이 없습니다."}`,
          response_type: "ephemeral",
        };
        break;

      case "/오늘할일":
      case "/todo":
        if (!args || !args.trim()) {
          response = {
            text: "할일 내용을 입력해주세요.\n\n사용법: `/오늘할일 [할일]`",
            response_type: "ephemeral",
          };
          break;
        }

        response = {
          text: `*${user_name}*님의 오늘 할일이 등록되었습니다!\n\n${args}`,
          response_type: "ephemeral",
        };
        break;

      default:
        response = {
          text: `*사용 가능한 명령어*\n\n• \`/공지 [내용]\` → 전체 공지사항 작성\n• \`/팀원목록\` → 현재 팀원 조회\n• \`/오늘할일 [할일]\` → 할일 등록\n\n*현재 채널:* ${channel.display_name}`,
          response_type: "ephemeral",
        };
    }

    res.json(response);
  } catch (error) {
    console.error("Slack 명령어 에러:", error);
    res.json({
      text: "명령어 처리 중 오류가 발생했습니다.",
      response_type: "ephemeral",
    });
  }
};