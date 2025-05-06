export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 text-green-500 text-sm mb-4">
      <span>Typing</span>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
      </div>
    </div>
  )
}
