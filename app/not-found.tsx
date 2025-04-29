import Link from "next/link"
import Image from "next/image"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#2e3137] p-4">
      <div className="text-center">
        <div className="mb-6">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Frame%203491%20%281%29%2013-abVgGwfyDhrdu9TeQuBQhPA6OCXAKz.png"
            alt="Peer Wealth Token"
            width={80}
            height={80}
            className="mx-auto rounded-full"
          />
        </div>

        <h1 className="text-4xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-gray-300 mb-8">
          The page you're looking for doesn't exist or has been moved.
          <br />
          If you were verifying your email, your account may already be verified.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login" className="block">
            <button className="w-full py-3 px-6 bg-[#fff27a] hover:bg-yellow-400 rounded-full text-black font-medium transition-colors">
              Go to Login
            </button>
          </Link>

          <Link href="/dashboard" className="block">
            <button className="w-full py-3 px-6 bg-gray-700 hover:bg-gray-600 rounded-full text-white font-medium transition-colors">
              Go to Dashboard
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
