import { Request, Response } from "express";
import { ChannelModel } from "../models/Channel";
import { UserModel } from "../models/User";
import db from "../config/db";

interface SlackCommandRequest {
  command: string; // "/공지"
  text: string; // "테스트 공지입니다"
  user_name: string; // slack 사용자 이름
  channel_name: string; // "general"
  user_id: string; // slack userID
  channel_id: string; // slack channelID
  response_url?: string;
  team_id?: string;
  team_domain?: string;
}

export const handleSlackCommand = async (req: Request, res: Response) => {
  try {
    console.log("Slack Command 수신:", JSON.stringify(req.body, null, 2));

    const {
      command,
      text,
      user_name,
      channel_name,
      user_id,
      channel_id: slack_channel_id,
    } = req.body as SlackCommandRequest;

    let channel = null;
    try {
      channel = await ChannelModel.findBySlackChannel(`#${channel_name}`);
      console.log(
        "채널 조회 결과:",
        channel ? `찾음 (${channel.display_name})` : "없음"
      );
    } catch (channelError) {
      console.warn("채널 조회 실패 (무시):", channelError);
    }

    // 명령어별 처리
    switch (command) {
      // ===== 공지사항 =====
      case "/공지":
      case "/announcement":
        return await handleAnnouncementCommand(res, {
          text,
          user_id,
          user_name,
          channel,
        });

      // ===== 팀원 목록 =====
      case "/팀원목록":
      case "/team":
        return await handleTeamListCommand(res);

      // ===== 알 수 없는 명령어 =====
      default:
        return res.json({
          text: `알 수 없는 명령어입니다: \`${command}\`\n\n*사용 가능한 명령어:*\n• \`/공지 [내용]\` - 공지사항 작성\n• \`/팀원목록\` - 팀원 조회\n• \`/오늘할일 [내용]\` - 할일 등록`,
          response_type: "ephemeral",
        });
    }
  } catch (error) {
    console.error("Slack 명령어 처리 에러:", error);

    // Slack은 항상 200 응답 필요!
    return res.status(200).json({
      text: "명령어 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      response_type: "ephemeral",
    });
  }
};

// ===== 공지사항 명령어 처리 =====
async function handleAnnouncementCommand(
  res: Response,
  data: { text: string; user_id: string; user_name: string; channel: any }
) {
  const { text, user_id, user_name, channel } = data;

  // 내용 확인
  if (!text || !text.trim()) {
    return res.json({
      text: "공지 내용을 입력해주세요.\n\n*사용법:* `/공지 [공지 내용]`\n*예시:* `/공지 오늘 오후 3시에 팀 회의가 있습니다.`",
      response_type: "ephemeral",
    });
  }

  try {
    console.log("공지사항 저장 시도:", {
      text,
      user_id,
      channel_id: channel?.id,
    });

    // DB에 저장
    const [result] = await db.execute(
      `INSERT INTO Announcements (content, author_id, channel_id, created_at)
       VALUES (?, (SELECT id FROM Users WHERE slack_user_id = ? LIMIT 1), ?, NOW())`,
      [text.trim(), user_id, channel?.id || null]
    );

    const insertId = (result as any).insertId;
    console.log("공지사항 저장 성공:", insertId);

    // 성공 응답
    return res.json({
      text: `*공지사항이 TeamCollab 대시보드에 저장되었습니다!*\n\n*작성자:* ${user_name}\n*내용:* ${text}`,
      response_type: "in_channel", // 채널 전체에 표시
    });
  } catch (dbError: any) {
    console.error("DB 저장 실패:", dbError);

    // 사용자가 DB에 없는 경우
    if (
      dbError.code === "ER_BAD_NULL_ERROR" ||
      dbError.message?.includes("NULL")
    ) {
      return res.json({
        text: `TeamCollab에 등록되지 않은 사용자입니다.\n\n관리자에게 문의하여 계정을 생성해주세요.\n*Slack User ID:* \`${user_id}\``,
        response_type: "ephemeral",
      });
    }

    // 기타 DB 오류
    return res.json({
      text: "공지사항 저장 중 오류가 발생했습니다. 관리자에게 문의하세요.",
      response_type: "ephemeral",
    });
  }
}

// ===== 팀원 목록 명령어 처리 =====
async function handleTeamListCommand(res: Response) {
  try {
    console.log("팀원 목록 조회 시도");

    const teamMembers = await UserModel.findActiveTeamMembers();

    if (!teamMembers || teamMembers.length === 0) {
      return res.json({
        text: "*현재 팀원 목록*\n\n등록된 팀원이 없습니다.",
        response_type: "ephemeral",
      });
    }

    const membersList = teamMembers
      .map((m, index) => `${index + 1}. *${m.name}* - ${m.email}`)
      .join("\n");

    console.log(`팀원 목록 조회 성공: ${teamMembers.length}명`);

    return res.json({
      text: `👥 *현재 팀원 목록* (총 ${teamMembers.length}명)\n\n${membersList}`,
      response_type: "ephemeral",
    });
  } catch (error) {
    console.error("팀원 목록 조회 실패:", error);
    return res.json({
      text: "팀원 목록 조회 중 오류가 발생했습니다.",
      response_type: "ephemeral",
    });
  }
}
