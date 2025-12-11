//출퇴근 상태 텍스트 변환
export function getStatusText(status: string): string {
  const statusMap: { [key: string]: string } = {
    present: '정상 출근',
    absent: '결근',
    late: '지각',
    half_day: '반차',
    leave: '휴가',
    remote: '재택근무',
  };
  return statusMap[status] || '알 수 없음';
}

// 날짜를 YYYY-MM-DD 형식으로 변환
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 시간을 HH:MM 형식으로 변환 (한국 시간)
export function formatTime(datetime: Date | string): string {
  const date = typeof datetime === 'string' ? new Date(datetime) : datetime;
  
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul'
  });
}

// 근무 시간 계산 (시간 단위)
export function calculateWorkHours(clockIn: Date | string, clockOut: Date | string): number {
  const inTime = typeof clockIn === 'string' ? new Date(clockIn) : clockIn;
  const outTime = typeof clockOut === 'string' ? new Date(clockOut) : clockOut;
  
  const workMillis = outTime.getTime() - inTime.getTime();
  const workHours = workMillis / (1000 * 60 * 60);
  
  return Math.round(workHours * 100) / 100; // 소수점 2자리
}

// 오늘 날짜 (YYYY-MM-DD)
export function getToday(): string {
  const now = new Date();
  return formatDate(now);
}
