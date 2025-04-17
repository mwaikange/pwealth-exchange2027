"use client"

import { useRouter } from "next/navigation"
import { Copy } from "lucide-react"
import { useState } from "react"
import Image from "next/image"

export default function Settings() {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [showCopyNotification, setShowCopyNotification] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setShowCopyNotification(true)
    setTimeout(() => {
      setCopied(false)
      setShowCopyNotification(false)
    }, 2000)
  }

  return (
    <div className="h-[calc(100vh-130px)] bg-[#1c1e26] overflow-hidden">
      {/* Page Title */}
      <div className="px-6 pt-4 pb-2">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 text-sm">Change your Password, Setup MFA and Connect with our Groups</p>
      </div>

      {/* Settings Grid */}
      <div className="px-6">
        <div
          className="grid gap-5 h-[calc(100vh-200px)]"
          style={{
            transform: "scale(0.85)",
            transformOrigin: "top left",
            width: "118%", // Compensate for the scale to maintain proper sizing
            marginTop: "0.5rem",
            gridTemplateColumns: "1fr 1fr 1fr", // Equal width columns
          }}
        >
          {/* Block 1 (Left): Setup MFA + Change Password */}
          <div className="bg-[#2b2b31] rounded-lg p-5 flex flex-col">
            {/* Setup MFA Section */}
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4 text-center">SETUP MFA</h2>
              <div className="flex justify-center mb-8">
                <button className="bg-[#f5f5f5] hover:bg-gray-200 text-black px-6 py-2 rounded-md text-sm">
                  start
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700 my-4"></div>

            {/* Change Password Section */}
            <div className="mt-2">
              <div className="flex justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-400">Email :</div>
                  <div className="text-sm text-gray-400">Country :</div>
                </div>
                <div>
                  <div className="text-sm text-green-500">someone@gmail.com</div>
                  <div className="text-sm text-green-500">South Africa</div>
                </div>
              </div>

              <h3 className="text-lg font-medium mb-3">Change Password</h3>

              <div className="space-y-3 mb-4">
                <input
                  type="password"
                  placeholder="Old Password"
                  className="w-full p-3 rounded bg-[#f5f5f5] text-[#c5c6c8] border-0"
                />
                <input
                  type="password"
                  placeholder="New Password"
                  className="w-full p-3 rounded bg-[#f5f5f5] text-[#c5c6c8] border-0"
                />
              </div>

              <div className="flex-grow"></div>

              <div className="flex justify-center">
                <button className="bg-[#f5f5f5] hover:bg-gray-200 text-black px-6 py-2 rounded-md text-sm">
                  Confirm
                </button>
              </div>
            </div>
          </div>

          {/* Block 2 (Center): Referral Email Input + Customer Service Agents */}
          <div className="bg-[#2b2b31] rounded-lg p-5 flex flex-col">
            {/* Referral Email Input Section */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="pwt@example.com"
                className="w-full p-2 rounded bg-[#f5f5f5] text-[#c5c6c8] border-0 mb-2 text-xs"
              />

              <p className="text-xs text-gray-400 mb-1">Paste email address OR REFERRAL CODE of your Referral here.</p>
              <p className="text-xs text-gray-400 mb-2">**NB once completed this cant be changed for this account</p>

              <div className="flex justify-center mt-2 mb-4">
                <button className="bg-[#f5f5f5] hover:bg-gray-200 text-black px-4 py-1 rounded-md text-xs">
                  Confirm
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700 my-4"></div>

            {/* Customer Service Agents Section */}
            <div className="mt-2">
              <h2 className="text-xl font-bold text-center mb-4">CUSTOMER SERVICE AGENTS</h2>

              <div className="grid grid-cols-2 gap-4">
                {/* Telegram 1 */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[#4285f4] flex items-center justify-center mb-3">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Frame%20237788-Vpx4erYoQ2NNhrf7ypdqd2ghLTHxvs.png"
                      alt="Telegram"
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  </div>
                  <button className="bg-[#f5f5f5] hover:bg-gray-200 text-black px-3 py-2 rounded-md text-xs w-full">
                    Join Telegram Group
                  </button>
                </div>

                {/* AI Agent 1 */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[#4285f4] flex items-center justify-center mb-3">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Frame%20237788-Vpx4erYoQ2NNhrf7ypdqd2ghLTHxvs.png"
                      alt="Telegram"
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  </div>
                  <button className="bg-[#f5f5f5] hover:bg-gray-200 text-black px-3 py-2 rounded-md text-xs w-full">
                    Talk to AI Agent
                  </button>
                </div>

                {/* Telegram 2 */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[#4285f4] flex items-center justify-center mb-3">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Frame%20237788-Vpx4erYoQ2NNhrf7ypdqd2ghLTHxvs.png"
                      alt="Telegram"
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  </div>
                  <button className="bg-[#f5f5f5] hover:bg-gray-200 text-black px-3 py-2 rounded-md text-xs w-full">
                    Talk to AI Agent
                  </button>
                </div>

                {/* WhatsApp */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[#34a853] flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 22c-5.523 0-10-4.477-10-10S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                    </svg>
                  </div>
                  <button className="bg-[#f5f5f5] hover:bg-gray-200 text-black px-3 py-2 rounded-md text-xs w-full">
                    Join Whatsapp Channel
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Block 3 (Right): Referral Programme (unchanged) */}
          <div className="bg-[#2b2b31] rounded-lg p-5 flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-center underline">REFERRAL PROGRAMME</h2>

            <div className="space-y-4 flex-1">
              <p className="text-sm">
                You can claim 1 x PWT Cashout Token once your referral has completed (claimed) on all vesting schedules
                on level 1.
              </p>

              <p className="text-sm">So basically, whenn your referral has unlocked level 2.</p>

              <div className="mt-4">
                <p className="text-sm mb-2">You can claim here</p>
                <button
                  onClick={() => router.push("/dashboard/referrals")}
                  className="w-full bg-[#d9d9d9] hover:bg-gray-300 text-black py-2 rounded-md text-sm font-medium"
                >
                  claim now
                </button>
              </div>

              <div className="mt-4 relative">
                <p className="text-sm mb-2">
                  This is your referral link - share it on your socials to refer and benefit from the referral
                  programme:
                </p>
                <div className="flex items-center">
                  <button
                    onClick={() => copyToClipboard("www.peer-wealth.com/ref/3000278")}
                    className="mr-2 p-1 hover:bg-gray-700 rounded"
                    title="Copy to clipboard"
                  >
                    <Copy size={16} className={copied ? "text-green-500" : "text-gray-400"} />
                  </button>
                  <p className="text-[#4285f4] text-sm break-all">www.peer-wealth.com/ref/3000278</p>
                  {showCopyNotification && (
                    <div className="absolute ml-6 mt-6 bg-green-500 text-white px-2 py-1 rounded text-xs">
                      Copied to clipboard!
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-10">
                <p className="text-sm mb-1">This is your Referral Code / ID</p>
                <p className="text-2xl font-bold">RFRL-3000278</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
