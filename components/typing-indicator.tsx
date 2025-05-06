interface TypingIndicatorProps {
  assistantName?: string
}

export function TypingIndicator({ assistantName = "Assistant" }: TypingIndicatorProps) {
  return (
    <div className="flex items-start mb-4">
      <div className="bg-[#1e1e21] border border-[#fff27a]/30 text-white rounded-lg p-4 max-w-[85%]">
        <div className="font-semibold text-sm mb-2">{assistantName}</div>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-[#fff27a] rounded-full animate-pulse mr-1"></div>
          <div className="w-2 h-2 bg-[#fff27a] rounded-full animate-pulse delay-150 mr-1"></div>
          <div className="w-2 h-2 bg-[#fff27a] rounded-full animate-pulse delay-300"></div>
        </div>
      </div>
    </div>
  )
}
