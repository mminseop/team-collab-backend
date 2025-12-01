import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { ChannelModel } from "../models/Channel";

export const getChannels = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) return res.status(401).json({ error: "로그인이 필요합니다." });

    const channels = await ChannelModel.findAllByUser(
      user.departmentId,
      user.role
    );

    res.json({
      success: true,
      data: channels,
      count: channels.length,
      filters: {
        role: user.role,
        departmentId: user.departmentId,
      },
    });
  } catch (error) {
    console.error("채널 목록 에러:", error);
    res.status(500).json({ error: "채널 목록을 가져올 수 없습니다." });
  }
};

export const createChannel = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    // 명확한 타입 가드
    if (!user || user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "관리자만 채널을 생성할 수 있습니다." });
    }

    const {
      name,
      display_name,
      department_id,
      type = "general",
      slack_channel_id,
    } = req.body;

    if (!name || !display_name) {
      return res
        .status(400)
        .json({ error: "채널 이름과 표시이름이 필요합니다." });
    }

    const channelId = await ChannelModel.create({
      name,
      display_name,
      department_id: department_id ? parseInt(department_id as string) : null,
      type: type as any,
      slack_channel_id: slack_channel_id || null,
    });

    res.status(201).json({
      success: true,
      channelId,
      message: "채널이 생성되었습니다.",
    });
  } catch (error: any) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "이미 존재하는 채널 이름입니다." });
    }
    console.error("채널 생성 에러:", error);
    res.status(500).json({ error: "채널 생성 실패" });
  }
};

export const getChannelById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // 명확한 타입 가드
    if (!user) {
      return res.status(401).json({ error: "로그인이 필요합니다." });
    }

    // 권한 체크
    const channels = await ChannelModel.findAllByUser(
      user.departmentId,
      user.role
    );
    const targetChannel = channels.find((c) => c.id === parseInt(id));

    if (!targetChannel) {
      return res.status(404).json({ error: "채널을 찾을 수 없습니다." });
    }

    res.json({
      success: true,
      data: targetChannel,
    });
  } catch (error) {
    res.status(500).json({ error: "채널 정보를 가져올 수 없습니다." });
  }
};
