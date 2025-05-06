import ReactMarkdown from "react-markdown"

interface ChatMessageProps {
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  isLastMessage?: boolean
  assistantName?: string
}

export function ChatMessage({
  role,
  content,
  timestamp,
  isLastMessage = false,
  assistantName = "Assistant",
}: ChatMessageProps) {
  // Function to make referral links clickable
  const processContent = (content: string) => {
    // Regex to find referral links
    const referralLinkRegex = /(www\.peer-wealth\.com\/register\?ref=[\w-]+)/g

    // Replace referral links with clickable links
    return content.replace(referralLinkRegex, (match) => {
      return `[${match}](https://${match})`
    })
  }

  const processedContent = processContent(content)

  return (
    <div className={`mb-4 ${isLastMessage ? "animate-fadeIn" : ""} ${role === "user" ? "ml-auto" : ""}`}>
      <div
        className={`rounded-lg p-4 max-w-[85%] ${
          role === "user" ? "bg-[#3a3e47] text-white ml-auto" : "bg-[#1e1e21] border border-[#fff27a]/30 text-white"
        }`}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-sm">{role === "user" ? "You" : assistantName}</span>
          <span className="text-xs text-gray-400">
            {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            components={{
              a: ({ node, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" className="text-[#fff27a] hover:underline" />
              ),
              p: ({ node, ...props }) => <p {...props} className="mb-2" />,
              ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-5 mb-2" />,
              ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-5 mb-2" />,
              li: ({ node, ...props }) => <li {...props} className="mb-1" />,
              strong: ({ node, ...props }) => <strong {...props} className="font-bold text-[#fff27a]" />,
              code: ({ node, ...props }) => (
                <code {...props} className="bg-[#2a2a2a] px-1 py-0.5 rounded text-[#fff27a] text-sm" />
              ),
              pre: ({ node, ...props }) => (
                <pre {...props} className="bg-[#2a2a2a] p-3 rounded-md overflow-x-auto text-sm mb-3" />
              ),
            }}
          >
            {processedContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
