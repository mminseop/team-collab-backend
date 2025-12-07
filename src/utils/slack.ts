import axios from "axios";

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

interface SlackResponse {
  ok: boolean;
  ts?: string;
  channel?: string;
  error?: string;
}

// Slack 메시지 전송
export const sendSlackMessage = async (
  channel: string,
  text: string
): Promise<SlackResponse | null> => {
  try {
    if (SLACK_BOT_TOKEN) {
      // Slack Bot Token 사용 (권장)
      const response = await axios.post<SlackResponse>(
        "https://slack.com/api/chat.postMessage",
        {
          channel,
          text,
          mrkdwn: true,
        },
        {
          headers: {
            Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.ok) {
        throw new Error(response.data.error || "Slack API 오류");
      }

      return response.data;
    } else if (SLACK_WEBHOOK_URL) {
      // Webhook 사용 (간단, 하지만 ts 없음)
      await axios.post(SLACK_WEBHOOK_URL, { text });
      return null;
    } else {
      console.warn("Slack 설정이 없습니다. 메시지를 전송하지 않습니다.");
      return null;
    }
  } catch (error) {
    console.error("Slack 메시지 전송 실패:", error);
    throw error;
  }
};

// Slack 메시지 삭제
export const deleteSlackMessage = async (
  channel: string,
  ts: string
): Promise<SlackResponse> => {
  try {
    if (!SLACK_BOT_TOKEN) {
      throw new Error("SLACK_BOT_TOKEN이 설정되지 않았습니다.");
    }

    const response = await axios.post<SlackResponse>(
      "https://slack.com/api/chat.delete",
      {
        channel,
        ts,
      },
      {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data.ok) {
      throw new Error(response.data.error || "Slack 메시지 삭제 실패");
    }

    return response.data;
  } catch (error) {
    console.error("Slack 메시지 삭제 실패:", error);
    throw error;
  }
};

// Slack 메시지 업데이트
export const updateSlackMessage = async (
  channel: string,
  ts: string,
  text: string
): Promise<SlackResponse> => {
  try {
    if (!SLACK_BOT_TOKEN) {
      throw new Error("SLACK_BOT_TOKEN이 설정되지 않았습니다.");
    }

    const response = await axios.post<SlackResponse>(
      "https://slack.com/api/chat.update",
      {
        channel,
        ts,
        text,
        mrkdwn: true,
      },
      {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data.ok) {
      throw new Error(response.data.error || "Slack 메시지 업데이트 실패");
    }

    return response.data;
  } catch (error) {
    console.error("Slack 메시지 업데이트 실패:", error);
    throw error;
  }
};