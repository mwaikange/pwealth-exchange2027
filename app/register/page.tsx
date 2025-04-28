import { Suspense } from "react"
import { RegisterForm } from "@/components/register-form"

export default function Register() {
  return (
    <div
      className="h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage:
          "url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/peerWealth_Cursor.png-c2lG2VfEYHcmowwpSnYj2xfYm1gZv5.jpeg')",
      }}
    >
      <div className="w-full max-w-md flex items-center justify-center">
        <Suspense fallback={<div className="p-4 bg-white/80 rounded-lg">Loading registration form...</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  )
}
