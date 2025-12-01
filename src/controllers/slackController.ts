import { Request, Response } from "express";
import { ChannelModel } from "../models/Channel";

interface SlackCommand {
  text: string;
  user_name: string;
  channel_name: string;
  user_id: string;
  response_url?: string;
}

export const handleSlackCommand = async (req: Request, res: Response) => {
  try {
    const { text, user_name, channel_name, user_id } = req.body as SlackCommand;

    // Slack 채널 > TeamCollab 채널 매핑
    const channel = await ChannelModel.findBySlackChannel(`#${channel_name}`);
    if (!channel) {
      return res.status(404).json({
        text: "❌ 이 Slack 채널은 TeamCollab과 연동되지 않았습니다.",
        response_type: "ephemeral",
      });
    }

    const command = text.split(" ")[0].toLowerCase().trim();
    const args = text.replace(command, "").trim();

    let response: any = {};

    switch (command) {
      case "/오늘할일":
      case "/tasks":
        response = {
          text: ` *${user_name}*님의 오늘 할일이 *${
            channel.display_name
          }* 채널에 추가되었습니다!\n\n**할일:** ${args || "할일 내용 없음"}`,
          response_type: "ephemeral",
        };
        break;

      case "/회의록":
      case "/minutes":
        response = {
          text: `*${
            channel.display_name
          }* 채널에 회의록이 저장되었습니다!\n\n**${user_name}** 작성\n${
            args || "회의록 내용 없음"
          }`,
          response_type: "in_channel",
        };
        break;

      case "/task":
        response = {
          text: ` 할일 등록 완료!\n\n*채널:* ${
            channel.display_name
          }\n*작성자:* ${user_name}\n*내용:* ${args || "상세 내용 없음"}`,
        };
        break;

      default:
        response = {
          text: `*사용 가능한 명령어:*\n\n• \`/오늘할일 [할일 내용]\` → 오늘 할일 등록\n• \`/회의록 [내용]\` → 회의록 저장\n• \`/task [상세할일]\` → 태스크 등록\n\n*현재 채널:* ${channel.display_name}`,
          response_type: "ephemeral",
        };
    }

    res.json(response);
  } catch (error) {
    console.error("Slack 명령어 에러:", error);
    res.status(500).json({
      text: "Slack 명령어 처리 중 오류가 발생했습니다.",
      response_type: "ephemeral",
    });
  }
};
