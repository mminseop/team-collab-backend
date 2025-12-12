import { Request, Response } from "express";
import db from "../config/db";
import {
  formatTime,
  calculateWorkHours,
  getToday,
} from "../utils/attendanceUtils";

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    name: string;
    role: string;
  };
}

// ===== 출근 기록 =====
export const checkIn = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ message: "인증되지 않은 사용자입니다." });
    }

    const today = getToday();
    const now = new Date();

    // 이미 출근 기록이 있는지 확인
    const [existing] = await db.execute(
      "SELECT * FROM Attendances WHERE user_id = ? AND date = ?",
      [userId, today]
    );

    if ((existing as any[]).length > 0) {
      return res.status(400).json({ message: "이미 출근 처리되었습니다." });
    }

    // 출근 기록 생성
    await db.execute(
      `INSERT INTO Attendances (user_id, date, clock_in, status, created_at)
       VALUES (?, ?, ?, 'present', NOW())`,
      [userId, today, now]
    );

    const clockInTime = formatTime(now);

    return res.status(200).json({
      message: "출근 처리되었습니다.",
      data: {
        checkIn: clockInTime,
        date: today,
      },
    });
  } catch (error) {
    console.error("출근 기록 실패:", error);
    return res
      .status(500)
      .json({ message: "출근 기록 중 오류가 발생했습니다." });
  }
};

// ===== 퇴근 기록 =====
export const checkOut = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "인증되지 않은 사용자입니다." });
    }

    const today = getToday();
    const now = new Date();

    // 오늘 출근 기록 조회
    const [records] = await db.execute(
      "SELECT * FROM Attendances WHERE user_id = ? AND date = ?",
      [userId, today]
    );

    const record = (records as any[])[0];

    if (!record) {
      return res.status(400).json({ message: "출근 기록이 없습니다." });
    }

    if (record.clock_out) {
      return res.status(400).json({ message: "이미 퇴근 처리되었습니다." });
    }

    // 근무 시간 계산
    const workHours = calculateWorkHours(record.clock_in, now);

    // 퇴근 기록 업데이트
    await db.execute(
      `UPDATE Attendances 
       SET clock_out = ?, work_hours = ?, updated_at = NOW() 
       WHERE id = ?`,
      [now, workHours, record.id]
    );

    const clockOutTime = formatTime(now);

    return res.status(200).json({
      message: "퇴근 처리되었습니다.",
      data: {
        checkOut: clockOutTime,
        workHours: `${workHours}h`,
      },
    });
  } catch (error) {
    console.error("퇴근 기록 실패:", error);
    return res
      .status(500)
      .json({ message: "퇴근 기록 중 오류가 발생했습니다." });
  }
};

// ===== 오늘 출퇴근 현황 조회 =====
export const getTodayAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "인증되지 않은 사용자입니다." });
    }

    const today = getToday();

    // 오늘 출근 기록 조회
    const [records] = await db.execute(
      "SELECT * FROM Attendances WHERE user_id = ? AND date = ?",
      [userId, today]
    );

    const record = (records as any[])[0];

    if (!record) {
      return res.status(200).json({
        data: {
          isWorking: false,
          checkIn: null,
          checkOut: null,
          workHours: null,
        },
      });
    }

    const isWorking = record.clock_in && !record.clock_out;
    const checkIn = record.clock_in ? formatTime(record.clock_in) : null;
    const checkOut = record.clock_out ? formatTime(record.clock_out) : null;

    // 현재 근무 시간 계산
    let workHours = null;
    if (record.clock_in) {
      const endTime = record.clock_out
        ? new Date(record.clock_out)
        : new Date();
      const hours = calculateWorkHours(record.clock_in, endTime);
      workHours = `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;
    }

    return res.status(200).json({
      data: {
        isWorking,
        checkIn,
        checkOut,
        workHours,
      },
    });
  } catch (error) {
    console.error("출퇴근 현황 조회 실패:", error);
    return res.status(500).json({ message: "조회 중 오류가 발생했습니다." });
  }
};

// ===== 내 출퇴근 기록 조회 (월별) =====
export const getMyAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "인증되지 않은 사용자입니다." });
    }

    // month 파라미터 (기본값: 이번 달)
    const month = (req.query.month as string) || getToday().substring(0, 7);

    // 해당 월의 출퇴근 기록 조회
    const [records] = await db.execute(
      `SELECT 
         a.*,
         u.name as userName,
         d.name as department
       FROM Attendances a
       JOIN Users u ON a.user_id = u.id
       LEFT JOIN Departments d ON u.department_id = d.id
       WHERE a.user_id = ? 
         AND DATE_FORMAT(a.date, '%Y-%m') = ?
       ORDER BY a.date DESC`,
      [userId, month]
    );

    const formattedRecords = (records as any[]).map((record) => {
      const workHours = record.work_hours || 0;
      const hours = Math.floor(workHours);
      const minutes = Math.round((workHours % 1) * 60);

      return {
        id: record.id.toString(),
        userId: record.user_id.toString(),
        userName: record.userName,
        department: record.department || "미배정",
        date: record.date,
        checkIn: record.clock_in ? formatTime(record.clock_in) : "-",
        checkOut: record.clock_out ? formatTime(record.clock_out) : "-",
        workHours: record.clock_out ? `${hours}h ${minutes}m` : "-",
        status: getStatusKorean(record.status),
      };
    });

    return res.status(200).json({
      data: formattedRecords,
    });
  } catch (error) {
    console.error("출퇴근 기록 조회 실패:", error);
    return res.status(500).json({ message: "조회 중 오류가 발생했습니다." });
  }
};

// ===== 내 출퇴근 통계 (월별) =====
export const getMyAttendanceStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "인증되지 않은 사용자입니다." });
    }

    const month = (req.query.month as string) || getToday().substring(0, 7);

    // 해당 월의 통계 조회
    const [stats] = await db.execute(
      `SELECT 
         COUNT(*) as workDays,
         AVG(work_hours) as avgWorkHours,
         SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as lateCount,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absentCount
       FROM Attendances
       WHERE user_id = ? 
         AND DATE_FORMAT(date, '%Y-%m') = ?
         AND clock_out IS NOT NULL`,
      [userId, month]
    );

    const stat = (stats as any[])[0];

    const avgHours = stat.avgWorkHours || 0;
    const avgHoursFormatted = `${Math.floor(avgHours)}h ${Math.round(
      (avgHours % 1) * 60
    )}m`;

    return res.status(200).json({
      data: {
        workDays: stat.workDays || 0,
        avgWorkHours: avgHoursFormatted,
        lateCount: stat.lateCount || 0,
        absentCount: stat.absentCount || 0,
      },
    });
  } catch (error) {
    console.error("통계 조회 실패:", error);
    return res.status(500).json({ message: "조회 중 오류가 발생했습니다." });
  }
};

// ===== 헬퍼 함수 =====
function getStatusKorean(status: string): string {
  const statusMap: { [key: string]: string } = {
    present: "출근",
    absent: "결근",
    late: "지각",
    half_day: "반차",
    leave: "휴가",
    remote: "재택",
  };
  return statusMap[status] || "알 수 없음";
}
