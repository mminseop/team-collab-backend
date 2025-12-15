import { Request, Response } from "express";
import axios from "axios";

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || "";

interface GitHubWebhookPayload {
  ref?: string;
  repository: {
    name: string;
    full_name: string;
  };
  pusher?: {
    name: string;
  };
  head_commit?: {
    message: string;
    url: string;
    author: {
      name: string;
    };
  };
  workflow_run?: {
    name: string;
    head_branch: string;
    conclusion: string;
    status: string;
    html_url: string;
    head_commit: {
      message: string;
      author: {
        name: string;
      };
    };
  };
  action?: string;
  deployment?: {
    environment: string;
    description: string;
  };
  deployment_status?: {
    state: string;
    description: string;
    target_url: string;
  };
}

export const handleGitHubWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.headers["x-github-event"] as string;
    const payload = req.body as GitHubWebhookPayload;

    console.log("📥 GitHub Webhook 수신:", event);
    console.log("📦 Payload:", JSON.stringify(payload, null, 2));

    let slackMessage = null;

    // 이벤트 타입별 처리
    switch (event) {
      case "push":
        slackMessage = createPushMessage(payload);
        break;

      case "workflow_run":
        if (payload.action === "completed") {
          slackMessage = createWorkflowMessage(payload);
        }
        break;

      case "deployment_status":
        slackMessage = createDeploymentMessage(payload);
        break;

      default:
        console.log(`⚠️ 처리하지 않는 이벤트: ${event}`);
    }

    // Slack 알림 전송
    if (slackMessage && SLACK_WEBHOOK_URL) {
      await axios.post(SLACK_WEBHOOK_URL, slackMessage);
      console.log("✅ Slack 알림 전송 완료");
    }

    return res.status(200).json({ message: "Webhook 처리 완료" });
  } catch (error) {
    console.error("❌ Webhook 처리 실패:", error);
    return res.status(500).json({ message: "Webhook 처리 실패" });
  }
};

// Push 이벤트 메시지
function createPushMessage(payload: GitHubWebhookPayload) {
  const branch = payload.ref?.replace("refs/heads/", "") || "unknown";
  const author = payload.pusher?.name || payload.head_commit?.author.name || "Unknown";
  const commitMessage = payload.head_commit?.message || "No commit message";
  const commitUrl = payload.head_commit?.url || "";
  const repo = payload.repository.full_name;

  return {
    username: "GitHub CI/CD Bot",
    icon_emoji: ":rocket:",
    attachments: [
      {
        color: "#36a64f",
        title: `📦 새로운 Push - ${repo}`,
        fields: [
          {
            title: "Branch",
            value: branch,
            short: true,
          },
          {
            title: "Author",
            value: author,
            short: true,
          },
          {
            title: "Commit",
            value: `<${commitUrl}|${commitMessage}>`,
            short: false,
          },
        ],
        footer: "TeamCollab Backend",
        footer_icon: "https://github.githubassets.com/favicon.ico",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

// Workflow 완료 메시지
function createWorkflowMessage(payload: GitHubWebhookPayload) {
  const workflow = payload.workflow_run;
  if (!workflow) return null;

  const isSuccess = workflow.conclusion === "success";
  const color = isSuccess ? "good" : "danger";
  const emoji = isSuccess ? "✅" : "❌";
  const title = `${emoji} ${workflow.name} - ${isSuccess ? "성공" : "실패"}`;
  const author = workflow.head_commit.author.name;
  const branch = workflow.head_branch;
  const commit = workflow.head_commit.message;
  const url = workflow.html_url;
  const repo = payload.repository.full_name;

  return {
    username: "GitHub CI/CD Bot",
    icon_emoji: isSuccess ? ":tada:" : ":x:",
    attachments: [
      {
        color,
        title,
        fields: [
          {
            title: "Repository",
            value: repo,
            short: true,
          },
          {
            title: "Branch",
            value: branch,
            short: true,
          },
          {
            title: "Author",
            value: author,
            short: true,
          },
          {
            title: "Status",
            value: isSuccess ? "Success ✅" : "Failed ❌",
            short: true,
          },
          {
            title: "Commit",
            value: commit,
            short: false,
          },
          {
            title: "Workflow",
            value: `<${url}|View Details>`,
            short: false,
          },
        ],
        footer: "TeamCollab CI/CD",
        footer_icon: "https://github.githubassets.com/favicon.ico",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

// Deployment 상태 메시지
function createDeploymentMessage(payload: GitHubWebhookPayload) {
  const status = payload.deployment_status;
  if (!status) return null;

  const isSuccess = status.state === "success";
  const color = isSuccess ? "good" : status.state === "failure" ? "danger" : "warning";
  const emoji = isSuccess ? "✅" : status.state === "failure" ? "❌" : "⏳";
  const title = `${emoji} Deployment ${status.state}`;

  return {
    username: "GitHub CI/CD Bot",
    icon_emoji: ":rocket:",
    attachments: [
      {
        color,
        title,
        fields: [
          {
            title: "Environment",
            value: payload.deployment?.environment || "Unknown",
            short: true,
          },
          {
            title: "Status",
            value: status.state,
            short: true,
          },
          {
            title: "Description",
            value: status.description || "No description",
            short: false,
          },
          {
            title: "Details",
            value: `<${status.target_url}|View Deployment>`,
            short: false,
          },
        ],
        footer: "TeamCollab Deployment",
        footer_icon: "https://github.githubassets.com/favicon.ico",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}
