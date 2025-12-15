import { Request, Response } from "express";
import { UserModel } from "../models/User";
import db from "../config/db";
import {
  getStatusText,
  formatTime,
  calculateWorkHours,
  getToday,
} from "../utils/attendanceUtils";

interface SlackCommandRequest {
  command: string;
  text: string;
  user_name: string;
  channel_name: string;
  user_id: string;
  channel_id: string;
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

      case "/출근":
      case "/checkin":
        return await handleCheckInCommand(res, { user_id, user_name });

      case "/퇴근":
      case "/checkout":
        return await handleCheckOutCommand(res, { user_id, user_name });

      // 방문 통계 명령어 추가
      case "/방문":
      case "/visit":
      case "/visitors":
        return await handleVisitorStatsCommand(res, { text, user_id });
      default:
        return res.json({
          text: `알 수 없는 명령어입니다: \`${command}\`\n\n*사용 가능한 명령어:*\n• \`/공지 [내용]\` - 공지사항 작성\n• \`/팀원목록\` - 팀원 조회\n• \`/출근\` - 출근 기록\n• \`/퇴근\` - 퇴근 기록\n• \`/출퇴근 [날짜]\` - 출퇴근 조회`,
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
      `채널 조회 (${channelName}):`,
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
    const channel = await findChannelByNameOrDisplay("announcement");

    console.log("공지사항 저장 시도:", {
      text,
      user_id,
      user_name,
      channel_id: channel?.id,
    });

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

    return res.json({
      text: `*공지사항이 저장되었습니다!*\n\n*작성자:* ${user_name}\n*내용:* ${text}`,
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

// ===== 출퇴근 조회 명령어 처리 =====
async function handleAttendanceCommand(
  res: Response,
  data: { text: string; user_id: string; user_name: string }
) {
  const { text, user_id, user_name } = data;

  try {
    // 사용자 조회
    const [users] = await db.execute(
      "SELECT id FROM Users WHERE slack_user_id = ? LIMIT 1",
      [user_id]
    );

    const user = (users as any[])[0];
    if (!user) {
      return res.json({
        text: `TeamCollab에 등록되지 않은 사용자입니다.\n*Slack User ID:* \`${user_id}\``,
        response_type: "ephemeral",
      });
    }

    // 날짜 파싱
    let targetDate: string;
    const dateMatch = text.trim().match(/(\d{4}-\d{2}-\d{2})/);

    if (dateMatch) {
      targetDate = dateMatch[1];
    } else {
      targetDate = getToday();
    }

    console.log("출퇴근 조회:", { user_id: user.id, user_name, targetDate });

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
        text: `*${targetDate}* 출퇴근 기록\n\n출퇴근 기록이 없습니다.`,
        response_type: "ephemeral",
      });
    }

    // 시간 포맷
    const clockIn = record.clock_in ? formatTime(record.clock_in) : "미등록";
    const clockOut = record.clock_out ? formatTime(record.clock_out) : "미등록";
    const workHours = record.work_hours || "계산 중";
    const statusText = getStatusText(record.status);

    return res.json({
      text:
        `*${targetDate} 출퇴근 기록*\n\n` +
        `*이름:* ${user_name}\n` +
        `*출근:* ${clockIn}\n` +
        `*퇴근:* ${clockOut}\n` +
        `*근무 시간:* ${workHours}시간\n` +
        `*상태:* ${statusText}` +
        (record.notes ? `\n*비고:* ${record.notes}` : ""),
      response_type: "ephemeral",
    });
  } catch (error) {
    console.error("출퇴근 조회 실패:", error);
    return res.json({
      text: "출퇴근 조회 중 오류가 발생했습니다.",
      response_type: "ephemeral",
    });
  }
}

// ===== 출근 기록 명령어 처리 =====
async function handleCheckInCommand(
  res: Response,
  data: { user_id: string; user_name: string }
) {
  const { user_id, user_name } = data;

  try {
    // 사용자 조회
    const [users] = await db.execute(
      "SELECT id FROM Users WHERE slack_user_id = ? LIMIT 1",
      [user_id]
    );

    const user = (users as any[])[0];
    if (!user) {
      return res.json({
        text: "등록되지 않은 사용자입니다.",
        response_type: "ephemeral",
      });
    }

    const today = getToday();
    const now = new Date();

    // 중복 확인
    const [existing] = await db.execute(
      "SELECT * FROM Attendances WHERE user_id = ? AND date = ?",
      [user.id, today]
    );

    if ((existing as any[]).length > 0) {
      return res.json({
        text: "이미 출근 처리되었습니다.",
        response_type: "ephemeral",
      });
    }

    // 출근 기록 생성
    await db.execute(
      `INSERT INTO Attendances (user_id, date, clock_in, status)
       VALUES (?, ?, ?, 'present')`,
      [user.id, today, now]
    );

    const clockInTime = formatTime(now);

    return res.json({
      text: `*출근 완료!*\n\n*이름:* ${user_name}\n*시간:* ${clockInTime}`,
      response_type: "in_channel",
    });
  } catch (error) {
    console.error("출근 기록 실패:", error);
    return res.json({
      text: "출근 기록 중 오류가 발생했습니다.",
      response_type: "ephemeral",
    });
  }
}

// ===== 퇴근 기록 명령어 처리 =====
async function handleCheckOutCommand(
  res: Response,
  data: { user_id: string; user_name: string }
) {
  const { user_id, user_name } = data;

  try {
    // 사용자 조회
    const [users] = await db.execute(
      "SELECT id FROM Users WHERE slack_user_id = ? LIMIT 1",
      [user_id]
    );

    const user = (users as any[])[0];
    if (!user) {
      return res.json({
        text: "등록되지 않은 사용자입니다.",
        response_type: "ephemeral",
      });
    }

    const today = getToday();
    const now = new Date();

    // 출근 기록 조회
    const [records] = await db.execute(
      "SELECT * FROM Attendances WHERE user_id = ? AND date = ?",
      [user.id, today]
    );

    const record = (records as any[])[0];

    if (!record) {
      return res.json({
        text: "출근 기록이 없습니다. 먼저 `/출근`을 해주세요.",
        response_type: "ephemeral",
      });
    }

    if (record.clock_out) {
      return res.json({
        text: "이미 퇴근 처리되었습니다.",
        response_type: "ephemeral",
      });
    }

    // 근무 시간 계산
    const workHours = calculateWorkHours(record.clock_in, now);

    // 퇴근 기록 업데이트
    await db.execute(
      `UPDATE Attendances 
       SET clock_out = ?, work_hours = ? 
       WHERE id = ?`,
      [now, workHours, record.id]
    );

    const clockOutTime = formatTime(now);

    return res.json({
      text:
        `*퇴근 완료!*\n\n` +
        `*이름:* ${user_name}\n` +
        `*시간:* ${clockOutTime}\n` +
        `*근무 시간:* ${workHours}시간\n\n` +
        `수고하셨습니다!`,
      response_type: "in_channel",
    });
  } catch (error) {
    console.error("퇴근 기록 실패:", error);
    return res.json({
      text: "퇴근 기록 중 오류가 발생했습니다.",
      response_type: "ephemeral",
    });
  }
}

// ===== 방문 통계 명령어 처리 =====
async function handleVisitorStatsCommand(
  res: Response,
  data: { text: string; user_id: string }
) {
  const { text, user_id } = data;

  try {
    // 사용자 확인
    const [users] = await db.execute(
      "SELECT id FROM Users WHERE slack_user_id = ? LIMIT 1",
      [user_id]
    );

    const user = (users as any[])[0];
    if (!user) {
      return res.json({
        text: "등록되지 않은 사용자입니다.",
        response_type: "ephemeral",
      });
    }

    // 기간 파싱
    const param = text.trim().toLowerCase();
    let days = 7;
    let periodText = "최근 7일";

    if (param === "오늘" || param === "today") {
      days = 0;
      periodText = "오늘";
    } else if (param === "어제" || param === "yesterday") {
      days = 1;
      periodText = "어제";
    } else if (param === "" || param === "7일" || param === "week") {
      days = 7;
      periodText = "최근 7일";
    } else if (param === "30일" || param === "month") {
      days = 30;
      periodText = "최근 30일";
    } else if (param === "90일") {
      days = 90;
      periodText = "최근 90일";
    }

    console.log("📊 방문 통계 조회:", { user_id, days, periodText });

    // WHERE 절 구성
    let whereClause: string;
    let params: any[];

    if (days === 0) {
      whereClause = "DATE(visited_at) = CURDATE()";
      params = [];
    } else if (days === 1) {
      whereClause = "DATE(visited_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)";
      params = [];
    } else {
      whereClause = "visited_at >= DATE_SUB(NOW(), INTERVAL ? DAY)";
      params = [days];
    }

    // 1. 총 방문 수
    const [totalVisits] = await db.execute(
      `SELECT COUNT(*) as total FROM VisitorLogs WHERE ${whereClause}`,
      params
    );

    // 2. 유니크 방문자 수
    const [uniqueVisitors] = await db.execute(
      `SELECT COUNT(DISTINCT ip_address) as unique_visitors FROM VisitorLogs WHERE ${whereClause}`,
      params
    );

    // 3. 도시별 통계 (Top 10)
    const [cityStats] = await db.execute(
      `SELECT city, country, COUNT(*) as count FROM VisitorLogs 
       WHERE ${whereClause}
       GROUP BY city, country ORDER BY count DESC LIMIT 10`,
      params
    );

    // 4. 유니크 IP 목록 (최근 20개)
    const [uniqueIPs] = await db.execute(
      `SELECT DISTINCT ip_address, city, country, device_type, 
              MAX(visited_at) as last_visit
       FROM VisitorLogs 
       WHERE ${whereClause}
       GROUP BY ip_address, city, country, device_type
       ORDER BY last_visit DESC
       LIMIT 20`,
      params
    );

    // 5. 디바이스별 통계
    const [deviceStats] = await db.execute(
      `SELECT device_type, COUNT(*) as count FROM VisitorLogs 
       WHERE ${whereClause}
       GROUP BY device_type`,
      params
    );

    const total = (totalVisits as any[])[0]?.total || 0;
    const unique = (uniqueVisitors as any[])[0]?.unique_visitors || 0;

    // 데이터가 없는 경우
    if (total === 0) {
      return res.json({
        text: `*📊 방문 통계 (${periodText})*\n\n방문 기록이 없습니다.\n\n_`,
        response_type: "ephemeral",
      });
    }

    // 도시별 리스트 생성
    const cityList =
      (cityStats as any[])
        .map((c, i) => {
          const location = c.city && c.city !== "Unknown" 
            ? `${c.city}, ${c.country}` 
            : c.country || "Unknown";
          return `${i + 1}. ${location}: ${c.count}회`;
        })
        .join("\n") || "데이터 없음";

    // 유니크 IP 목록 생성
    const ipList =
      (uniqueIPs as any[])
        .map((ip, i) => {
          const location = ip.city && ip.city !== "Unknown"
            ? `${ip.city}, ${ip.country}`
            : ip.country || "Unknown";
          const time = new Date(ip.last_visit).toLocaleString("ko-KR", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          return `${i + 1}. \`${ip.ip_address}\` - ${location} (${ip.device_type}) _${time}_`;
        })
        .join("\n") || "데이터 없음";

    // 디바이스별 리스트 생성
    const deviceList =
      (deviceStats as any[])
        .map((d) => `• ${d.device_type}: ${d.count}회`)
        .join("\n") || "데이터 없음";

    // 메시지 생성 (긴 메시지는 2개로 분할)
    const message1 =
      `*📊 방문 통계 (${periodText})*\n\n` +
      `*총 방문:* ${total}회\n` +
      `*유니크 방문자:* ${unique}명\n\n` +
      `*🏙️ 도시별 방문 (Top 10)*\n${cityList}\n\n` +
      `*📱 디바이스별*\n${deviceList}\n`;

    const message2 =
      `*🌐 IP 유니크 목록 (최근 20개)*\n\n${ipList}\n\n` +
      `_💡 사용법: \`/방문 [오늘|어제|7일|30일]\`_`;

    console.log("✅ 방문 통계 조회 완료");

    // Slack은 3000자 제한이 있으므로, 메시지가 길면 분할 전송
    if (message1.length + message2.length < 3000) {
      // 한 번에 전송 가능
      return res.json({
        text: `${message1}\n\n${message2}`,
        response_type: "ephemeral",
      });
    } else {
      // 첫 번째 메시지만 즉시 응답
      res.json({
        text: message1,
        response_type: "ephemeral",
      });

      // 두 번째 메시지는 response_url로 전송 (선택사항)
      // 필요하면 axios로 response_url에 POST
    }

    return;
  } catch (error: any) {
    console.error("❌ 방문 통계 조회 실패:", error);
    console.error("에러 상세:", {
      message: error.message,
      code: error.code,
    });

    return res.json({
      text: `방문 통계 조회 중 오류가 발생했습니다.\n\n*에러:* ${error.message || "Unknown error"}`,
      response_type: "ephemeral",
    });
  }
}