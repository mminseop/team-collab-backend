import { Request, Response } from "express";
import db from "../config/db";
import { sendSlackMessage } from "../utils/slack"

// 공지사항 생성 (대시보드 → Slack 전송)
export const createAnnouncement = async (req: any, res: Response) => {
  try {
    const { title, content, channel_id } = req.body;
    const author_id = req.user.userId;

    if (!title || !content) {
      return res.status(400).json({ error: "제목과 내용을 입력하세요." });
    }

    // DB 저장
    const [result] = await db.execute(
      `INSERT INTO announcements (title, content, author_id, channel_id, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [title, content, author_id, channel_id || null]
    );

    const insertId = (result as any).insertId;

    // 사용자 정보 조회
    const [users] = await db.execute(
      "SELECT name FROM Users WHERE id = ?",
      [author_id]
    );
    const authorName = (users as any[])[0]?.name || "관리자";

    // Slack 전송
    let slackChannelId = "#general";
    if (channel_id) {
      const [channels] = await db.execute(
        "SELECT slack_channel_id FROM channels WHERE id = ?",
        [channel_id]
      );
      slackChannelId = (channels as any[])[0]?.slack_channel_id || "#general";
    }

    const slackMessage = `📢 *새 공지사항*\n\n*제목:* ${title}\n*작성자:* ${authorName}\n\n${content}`;
    
    const slackResponse = await sendSlackMessage(slackChannelId, slackMessage);

    // Slack 메시지 타임스탬프 저장 (나중에 삭제/수정용)
    if (slackResponse?.ts) {
      await db.execute(
        "UPDATE announcements SET slack_message_ts = ? WHERE id = ?",
        [slackResponse.ts, insertId]
      );
    }

    res.status(201).json({
      success: true,
      announcement: {
        id: insertId,
        title,
        content,
        author_id,
        channel_id,
      },
    });
  } catch (error) {
    console.error("CreateAnnouncement error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

// 공지사항 목록 조회
export const getAnnouncements = async (req: Request, res: Response) => {
  try {
    const [rows] = await db.execute(
      `SELECT a.id, a.title, a.content, a.is_pinned, a.created_at,
              u.name as author_name, c.display_name as channel_name
       FROM announcements a
       LEFT JOIN Users u ON a.author_id = u.id
       LEFT JOIN channels c ON a.channel_id = c.id
       ORDER BY a.is_pinned DESC, a.created_at DESC
       LIMIT 50`
    );

    res.json({
      success: true,
      announcements: rows,
    });
  } catch (error) {
    console.error("GetAnnouncements error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};
