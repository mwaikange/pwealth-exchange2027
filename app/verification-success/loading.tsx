import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#2e3137]">
      <div className="flex flex-col items-center">
        <Loader2 className="h-12 w-12 text-[#fff27a] animate-spin" />
        <p className="mt-4 text-white text-lg">Verifying your email...</p>
      </div>
    </div>
  )
}
