import type { ChatMessage } from "../../types";

export function resolveDisplayContent(
  msg: ChatMessage,
  t: (key: string) => string
): string {
  if (msg.role === "cold_start" && msg.cold_start_data?.questionKey) {
    return t(msg.cold_start_data.questionKey);
  }
  if (msg.role === "feedback" && msg.content.startsWith("chat.feedback.")) {
    return t(msg.content);
  }
  if (msg.source === "system") {
    return t(msg.content);
  }
  return msg.content;
}
