import { format } from "date-fns"
import ReactMarkdown from "react-markdown"

interface ChatMessageProps {
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === "user"

  return (
    <div className={`mb-4 ${isUser ? "text-right" : "text-left"}`}>
      <div
        className={`inline-block max-w-[80%] rounded-2xl px-4 py-2 ${
          isUser ? "bg-white text-black" : "bg-blue-100 text-black"
        }`}
      >
        <ReactMarkdown className="prose prose-sm">{content}</ReactMarkdown>
      </div>
      <div className="text-xs text-gray-200 mt-1">{format(timestamp, "h:mm a")}</div>
    </div>
  )
}
