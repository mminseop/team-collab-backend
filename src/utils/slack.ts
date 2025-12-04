import axios from "axios";

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

// Slack 메시지 전송
export const sendSlackMessage = async (channel: string, text: string) => {
  try {
    if (SLACK_BOT_TOKEN) {
      // Slack Bot Token 사용 (권장)
      const response = await axios.post(
        "https://slack.com/api/chat.postMessage",
        {
          channel,
          text,
          parse: "full",
        },
        {
          headers: {
            Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } else if (SLACK_WEBHOOK_URL) {
      // Webhook 사용 (간단)
      await axios.post(SLACK_WEBHOOK_URL, { text });
    }
  } catch (error) {
    console.error("Slack 메시지 전송 실패:", error);
    throw error;
  }
};
