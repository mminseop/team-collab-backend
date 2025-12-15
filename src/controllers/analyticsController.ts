import { Request, Response } from "express";
import db from "../config/db";
import axios from "axios";

// IP 정보 조회 (위치 정보 추가)
async function getIPInfo(ip: string) {
  try {
    // ipapi.co는 무료로 1일 1000회 제공
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    return {
      country: response.data.country_name || "Unknown",
      city: response.data.city || "Unknown",
    };
  } catch (error) {
    return { country: "Unknown", city: "Unknown" };
  }
}

// 디바이스 타입 감지
function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

// 방문자 기록 저장
export const trackVisitor = async (req: Request, res: Response) => {
  try {
    // IP 주소 추출 (Proxy/Load Balancer 고려)
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (req.headers["x-real-ip"] as string) ||
      req.socket.remoteAddress ||
      "Unknown";

    const userAgent = req.headers["user-agent"] || "Unknown";
    const referrer = req.headers["referer"] || req.headers["referrer"] || "Direct";
    const pageUrl = req.body.page_url || req.query.page_url || "/";

    console.log("📊 방문자 트래킹:", { ip, userAgent, pageUrl });

    // IP 정보 조회 (비동기 처리 - 응답 속도 개선)
    const deviceType = getDeviceType(userAgent);
    
    // 빠른 응답
    res.status(200).json({ 
      success: true,
      message: "Tracked",
    });

    // 백그라운드에서 IP 정보 조회 및 저장
    const ipInfo = await getIPInfo(ip);

    // DB에 저장
    await db.execute(
      `INSERT INTO VisitorLogs 
       (ip_address, user_agent, referrer, page_url, country, city, device_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ip, userAgent, referrer, pageUrl, ipInfo.country, ipInfo.city, deviceType]
    );

    console.log("✅ 방문자 로그 저장 완료:", { ip, country: ipInfo.country, city: ipInfo.city });
  } catch (error: any) {
    console.error("❌ 방문자 트래킹 실패:", error.message);
    // 에러가 나도 클라이언트에는 영향 없도록
    if (!res.headersSent) {
      res.status(200).json({ success: false });
    }
  }
};

// 방문 통계 조회 (관리자용)
export const getVisitorStats = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    // 1. 총 방문자 수
    const [totalVisits] = await db.execute(
      `SELECT COUNT(*) as total FROM VisitorLogs 
       WHERE visited_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    );

    // 2. 유니크 방문자 수 (IP 기준)
    const [uniqueVisitors] = await db.execute(
      `SELECT COUNT(DISTINCT ip_address) as unique_visitors FROM VisitorLogs 
       WHERE visited_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    );

    // 3. 국가별 통계
    const [countryStats] = await db.execute(
      `SELECT country, COUNT(*) as count FROM VisitorLogs 
       WHERE visited_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY country ORDER BY count DESC LIMIT 10`,
      [days]
    );

    // 4. 디바이스별 통계
    const [deviceStats] = await db.execute(
      `SELECT device_type, COUNT(*) as count FROM VisitorLogs 
       WHERE visited_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY device_type`,
      [days]
    );

    // 5. 페이지별 통계
    const [pageStats] = await db.execute(
      `SELECT page_url, COUNT(*) as count FROM VisitorLogs 
       WHERE visited_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY page_url ORDER BY count DESC LIMIT 10`,
      [days]
    );

    // 6. 일별 방문 추이
    const [dailyStats] = await db.execute(
      `SELECT DATE(visited_at) as date, COUNT(*) as visits, COUNT(DISTINCT ip_address) as unique_visitors
       FROM VisitorLogs 
       WHERE visited_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(visited_at) ORDER BY date DESC`,
      [days]
    );

    return res.status(200).json({
      period: `${days} days`,
      total_visits: (totalVisits as any)[0].total,
      unique_visitors: (uniqueVisitors as any)[0].unique_visitors,
      by_country: countryStats,
      by_device: deviceStats,
      by_page: pageStats,
      daily_trend: dailyStats,
    });
  } catch (error: any) {
    console.error("❌ 통계 조회 실패:", error.message);
    return res.status(500).json({ message: "통계 조회 실패" });
  }
};

// 최근 방문자 목록 (관리자용)
export const getRecentVisitors = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const [visitors] = await db.execute(
      `SELECT * FROM VisitorLogs 
       ORDER BY visited_at DESC 
       LIMIT ?`,
      [limit]
    );

    return res.status(200).json({ visitors });
  } catch (error: any) {
    console.error("❌ 방문자 목록 조회 실패:", error.message);
    return res.status(500).json({ message: "조회 실패" });
  }
};
