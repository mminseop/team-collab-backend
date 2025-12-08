import { Request, Response } from "express";
import db from "../config/db";
import { sendSlackMessage, deleteSlackMessage } from "../utils/slack";

// 공지사항 생성 (대시보드 > Slack 전송)
export const createAnnouncement = async (req: any, res: Response) => {
  try {
    const { content, channel_id } = req.body;
    const author_id = req.user.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "내용을 입력하세요." });
    }

    // 사용자 정보 조회 (roles 테이블 JOIN)
    const [users] = await db.execute(
      `SELECT u.name, r.name as role 
       FROM Users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [author_id]
    );
    const user = (users as any[])[0];
    
    if (!user) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    // 관리자 권한 확인
    if (user.role !== "ADMIN") {
      return res.status(403).json({ error: "관리자만 공지사항을 작성할 수 있습니다." });
    }

    // DB 저장
    const [result] = await db.execute(
      `INSERT INTO Announcements (content, author_id, channel_id, created_at)
       VALUES (?, ?, ?, NOW())`,
      [content.trim(), author_id, channel_id || null]
    );

    const insertId = (result as any).insertId;

    // Slack 전송
    let slackChannelId = process.env.SLACK_DEFAULT_CHANNEL || "#general";
    if (channel_id) {
      const [channels] = await db.execute(
        "SELECT slack_channel_id FROM channels WHERE id = ?",
        [channel_id]
      );
      const channelData = (channels as any[])[0];
      if (channelData?.slack_channel_id) {
        slackChannelId = channelData.slack_channel_id;
      }
    }

    const slackMessage = `📢 *공지사항*\n*작성자:* ${user.name}\n\n${content}`;
    
    try {
      const slackResponse = await sendSlackMessage(slackChannelId, slackMessage);

      // Slack 메시지 타임스탬프 저장 (나중에 삭제용)
      if (slackResponse?.ts) {
        await db.execute(
          "UPDATE Announcements SET slack_message_ts = ?, slack_channel_id = ? WHERE id = ?",
          [slackResponse.ts, slackChannelId, insertId]
        );
      }
    } catch (slackError) {
      console.error("Slack 전송 실패:", slackError);
      // Slack 전송 실패해도 DB 저장은 성공으로 처리
    }

    // 생성된 공지사항 조회 (roles JOIN 추가)
    const [newAnnouncement] = await db.execute(
      `SELECT a.id, a.content, a.created_at, a.channel_id,
              u.id as author_id, u.name as author_name, r.name as author_role
       FROM Announcements a
       LEFT JOIN Users u ON a.author_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE a.id = ?`,
      [insertId]
    );

    res.status(201).json({
      success: true,
      data: (newAnnouncement as any[])[0],
    });
  } catch (error) {
    console.error("CreateAnnouncement error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

// 공지사항 목록 조회
export const getAnnouncements = async (req: any, res: Response) => {
  try {
    const { channel_id } = req.query;

    let query = `
      SELECT a.id, a.content, a.created_at, a.channel_id,
             u.id as author_id, u.name as author_name, r.name as author_role
      FROM Announcements a
      LEFT JOIN Users u ON a.author_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
    `;
    
    const params: any[] = [];
    
    if (channel_id) {
      query += " WHERE a.channel_id = ?";
      params.push(channel_id);
    }
    
    query += " ORDER BY a.created_at DESC LIMIT 100";

    const [rows] = await db.execute(query, params);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("GetAnnouncements error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};

// 공지사항 삭제
export const deleteAnnouncement = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // 공지사항 조회 (roles JOIN 추가)
    const [announcements] = await db.execute(
      `SELECT a.*, r.name as author_role
       FROM Announcements a
       LEFT JOIN Users u ON a.author_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE a.id = ?`,
      [id]
    );

    const announcement = (announcements as any[])[0];
    
    if (!announcement) {
      return res.status(404).json({ error: "공지사항을 찾을 수 없습니다." });
    }

    // 현재 사용자 권한 확인 (roles JOIN 추가)
    const [users] = await db.execute(
      `SELECT r.name as role 
       FROM Users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [userId]
    );
    const currentUser = (users as any[])[0];
    
    // 권한 확인 (작성자 본인 또는 관리자)
    if (announcement.author_id !== userId && currentUser?.role !== "ADMIN") {
      return res.status(403).json({ error: "삭제 권한이 없습니다." });
    }

    // Slack 메시지 삭제
    if (announcement.slack_message_ts && announcement.slack_channel_id) {
      try {
        await deleteSlackMessage(announcement.slack_channel_id, announcement.slack_message_ts);
      } catch (slackError) {
        console.error("Slack 메시지 삭제 실패:", slackError);
        // Slack 삭제 실패해도 DB는 삭제 진행
      }
    }

    // DB에서 삭제
    await db.execute("DELETE FROM Announcements WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "공지사항이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("DeleteAnnouncement error:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};
