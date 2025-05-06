export function PeerGPTLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 rounded-full border-2 border-yellow-400"></div>
        <div className="absolute inset-1 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
      </div>
      <span className="text-white font-semibold">Peer GPT</span>
    </div>
  )
}
