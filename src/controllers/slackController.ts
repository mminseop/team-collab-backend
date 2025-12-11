import { Request, Response } from "express";
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

    // 명령어별 처리
    switch (command) {
      case "/공지":
      case "/announcement":
        return await handleAnnouncementCommand(res, {
          text,
          user_id,
          user_name,
        });

      case "/팀원목록":
      case "/team":
        return await handleTeamListCommand(res);

      case "/출퇴근":
      case "/attendance":
        return await handleAttendanceCommand(res, { text, user_id, user_name });

      default:
        return res.json({
          text: `알 수 없는 명령어입니다: \`${command}\`\n\n*사용 가능한 명령어:*\n• \`/공지 [내용]\` - 공지사항 작성\n• \`/팀원목록\` - 팀원 조회\n• \`/오늘할일 [내용]\` - 할일 등록`,
          response_type: "ephemeral",
        });
    }
  } catch (error) {
    console.error("Slack 명령어 처리 에러:", error);
    return res.status(200).json({
      text: "명령어 처리 중 오류가 발생했습니다.",
      response_type: "ephemeral",
    });
  }
};

// ===== 채널 찾기 헬퍼 함수 =====
async function findChannelByNameOrDisplay(
  channelName: string
): Promise<any | null> {
  try {
    const [channels] = await db.execute(
      `SELECT * FROM Channels 
       WHERE name = ? OR display_name = ? 
       LIMIT 1`,
      [channelName, channelName]
    );

    const channel = (channels as any[])[0] || null;

    console.log(
      `📍 채널 조회 (${channelName}):`,
      channel ? `찾음 (ID: ${channel.id}, name: ${channel.name})` : "없음"
    );

    return channel;
  } catch (error) {
    console.warn("채널 조회 실패:", error);
    return null;
  }
}

// ===== 공지사항 명령어 처리 =====
async function handleAnnouncementCommand(
  res: Response,
  data: { text: string; user_id: string; user_name: string }
) {
  const { text, user_id, user_name } = data;

  if (!text || !text.trim()) {
    return res.json({
      text: "공지 내용을 입력해주세요.\n\n*사용법:* `/공지 [공지 내용]`\n*예시:* `/공지 오늘 오후 3시에 팀 회의가 있습니다.`",
      response_type: "ephemeral",
    });
  }

  try {
    // 공지사항은 'announcement' 채널 찾기
    const channel = await findChannelByNameOrDisplay("announcement");

    console.log("공지사항 저장 시도:", {
      text,
      user_id,
      user_name,
      channel_id: channel?.id,
      channel_name: channel?.name,
    });

    // DB에 저장
    const [result] = await db.execute(
      `INSERT INTO Announcements (content, author_id, channel_id, created_at)
       VALUES (?, (SELECT id FROM Users WHERE slack_user_id = ? LIMIT 1), ?, NOW())`,
      [text.trim(), user_id, channel?.id || null]
    );

    const insertId = (result as any).insertId;
    console.log("공지사항 저장 성공:", {
      id: insertId,
      channel_id: channel?.id,
    });

    // 성공 응답
    return res.json({
      text: `*공지사항이 TeamCollab 대시보드에 저장되었습니다!*\n\n*작성자:* ${user_name}\n*내용:* ${text}`,
      response_type: "in_channel",
    });
  } catch (dbError: any) {
    console.error("DB 저장 실패:", dbError);

    if (
      dbError.code === "ER_BAD_NULL_ERROR" ||
      dbError.message?.includes("NULL")
    ) {
      return res.json({
        text: `TeamCollab에 등록되지 않은 사용자입니다.\n*Slack User ID:* \`${user_id}\``,
        response_type: "ephemeral",
      });
    }

    return res.json({
      text: "공지사항 저장 중 오류가 발생했습니다.",
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
      text: `*현재 팀원 목록* (총 ${teamMembers.length}명)\n\n${membersList}`,
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

// ===== 출퇴근 명령어 처리 =====
async function handleAttendanceCommand(
  res: Response,
  data: { text: string; user_id: string; user_name: string }
) {
  const { text, user_id, user_name } = data;

  try {
    // 사용자 ID 조회
    const [users] = await db.execute(
      "SELECT id FROM Users WHERE slack_user_id = ? LIMIT 1",
      [user_id]
    );

    const user = (users as any[])[0];
    if (!user) {
      return res.json({
        text: `⚠️ TeamCollab에 등록되지 않은 사용자입니다.\n*Slack User ID:* \`${user_id}\``,
        response_type: "ephemeral",
      });
    }

    // 날짜 파싱 (입력 없으면 오늘)
    let targetDate: string;
    const dateMatch = text.trim().match(/(\d{4}-\d{2}-\d{2})/);
    
    if (dateMatch) {
      targetDate = dateMatch[1];
    } else {
      // 오늘 날짜 (한국 시간)
      targetDate = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Seoul'
      }).replace(/\. /g, '-').replace('.', '');
    }

    console.log("📅 출퇴근 조회:", { user_id: user.id, user_name, targetDate });

    // 출퇴근 기록 조회
    const [records] = await db.execute(
      `SELECT * FROM Attendances 
       WHERE user_id = ? AND date = ? 
       LIMIT 1`,
      [user.id, targetDate]
    );

    const record = (records as any[])[0];

    if (!record) {
      return res.json({
        text: `📅 *${targetDate}* 출퇴근 기록\n\n❌ 출퇴근 기록이 없습니다.`,
        response_type: "ephemeral",
      });
    }

    // 출퇴근 정보 포맷
    const clockIn = record.clock_in 
      ? new Date(record.clock_in).toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Seoul'
        })
      : '미등록';

    const clockOut = record.clock_out 
      ? new Date(record.clock_out).toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Seoul'
        })
      : '미등록';

    const workHours = record.work_hours || '계산 중';
    const statusEmoji = getStatusEmoji(record.status);
    const statusText = getStatusText(record.status);

    return res.json({
      text: `📅 *${targetDate}* 출퇴근 기록\n\n` +
            `👤 *이름:* ${user_name}\n` +
            `🕐 *출근:* ${clockIn}\n` +
            `🕕 *퇴근:* ${clockOut}\n` +
            `⏱️ *근무 시간:* ${workHours}시간\n` +
            `${statusEmoji} *상태:* ${statusText}` +
            (record.notes ? `\n📝 *비고:* ${record.notes}` : ''),
      response_type: "ephemeral",
    });

  } catch (error) {
    console.error("❌ 출퇴근 조회 실패:", error);
    return res.json({
      text: "⚠️ 출퇴근 조회 중 오류가 발생했습니다.",
      response_type: "ephemeral",
    });
  }
}

// 상태 이모지
function getStatusEmoji(status: string): string {
  const emojiMap: { [key: string]: string } = {
    present: '✅',
    absent: '❌',
    late: '⏰',
    half_day: '📅',
    leave: '🏖️',
    remote: '🏠',
  };
  return emojiMap[status] || '❓';
}

// 상태 텍스트
function getStatusText(status: string): string {
  const textMap: { [key: string]: string } = {
    present: '정상 출근',
    absent: '결근',
    late: '지각',
    half_day: '반차',
    leave: '휴가',
    remote: '재택근무',
  };
  return textMap[status] || '알 수 없음';
}