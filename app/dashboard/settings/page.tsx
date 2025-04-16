"use client"

export default function Settings() {
  return (
    <div className="h-[calc(100vh-130px)] bg-[#1c1e26] overflow-hidden">
      {/* Page Title */}
      <div className="px-6 pt-4 pb-2">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 text-sm">Change your Password, Setup MFA and Connect with our Groups</p>
      </div>

      {/* Settings Grid */}
      <div className="px-6 grid grid-cols-2 gap-4 h-[calc(100vh-200px)]">
        {/* Customer Service Agents */}
        <div className="bg-[#2b2b31] rounded-lg p-5 flex flex-col">
          <h2 className="text-xl font-bold text-center mb-6">CUSTOMER SERVICE AGENTS</h2>

          <div className="grid grid-cols-2 gap-6 flex-1">
            {/* Telegram 1 */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#4285f4] flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm-3.5 8c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm7 0c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm-3.5 7.5c-2.5 0-4.5-1.5-5-3.5h10c-.5 2-2.5 3.5-5 3.5z" />
                </svg>
              </div>
              <button className="bg-[#f5f5f5] hover:bg-gray-200 text-black px-4 py-2 rounded-md text-sm w-full">
                Join Telegram Group
              </button>
            </div>

            {/* AI Agent 1 */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#4285f4] flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm-3.5 8c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm7 0c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm-3.5 7.5c-2.5 0-4.5-1.5-5-3.5h10c-.5 2-2.5 3.5-5 3.5z" />
                </svg>
              </div>
              <button className="bg-[#f5f5f5] hover:bg-gray-200 text-black px-4 py-2 rounded-md text-sm w-full">
                Talk to AI Agent
              </button>
            </div>

            {/* Telegram 2 */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#4285f4] flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm-3.5 8c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm7 0c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm-3.5 7.5c-2.5 0-4.5-1.5-5-3.5h10c-.5 2-2.5 3.5-5 3.5z" />
                </svg>
              </div>
              <button className="bg-[#f5f5f5] hover:bg-gray-200 text-black px-4 py-2 rounded-md text-sm w-full">
                Talk to AI Agent
              </button>
            </div>

            {/* WhatsApp */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#34a853] flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm-3.5 8c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm7 0c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm-3.5 7.5c-2.5 0-4.5-1.5-5-3.5h10c-.5 2-2.5 3.5-5 3.5z" />
                </svg>
              </div>
              <button className="bg-[#f5f5f5] hover:bg-gray-200 text-black px-4 py-2 rounded-md text-sm w-full">
                Join Whatsapp Channel
              </button>
            </div>
          </div>
        </div>

        {/* Referral Section */}
        <div className="bg-[#2b2b31] rounded-lg p-5 flex flex-col">
          <input
            type="text"
            placeholder="pwt@example.com"
            className="w-full p-3 rounded bg-[#f5f5f5] text-[#c5c6c8] border-0 mb-3"
          />

          <p className="text-sm text-gray-400 mb-1">Paste email address OR REFERRAL CODE of your Referral here.</p>
          <p className="text-sm text-gray-400 mb-6">**NB once completed this cant be changed for this account</p>

          <div className="flex-grow"></div>

          <div className="flex justify-center">
            <button className="bg-[#f5f5f5] hover:bg-gray-200 text-black px-6 py-2 rounded-md text-sm">Confirm</button>
          </div>
        </div>

        {/* Account & Password Section */}
        <div className="bg-[#2b2b31] rounded-lg p-5 flex flex-col">
          <div className="flex justify-between mb-6">
            <div>
              <div className="text-sm text-gray-400">Email :</div>
              <div className="text-sm text-gray-400">Country :</div>
            </div>
            <div>
              <div className="text-sm text-green-500">someone@gmail.com</div>
              <div className="text-sm text-green-500">South Africa</div>
            </div>
          </div>

          <h3 className="text-lg font-medium mb-4">Change Password</h3>

          <div className="space-y-4 mb-6">
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
            <button className="bg-[#f5f5f5] hover:bg-gray-200 text-black px-6 py-2 rounded-md text-sm">Confirm</button>
          </div>
        </div>

        {/* MFA Setup */}
        <div className="bg-[#2b2b31] rounded-lg p-5 flex flex-col">
          <h2 className="text-xl font-bold mb-6 text-center">SETUP MFA</h2>

          <div className="flex-grow"></div>

          <div className="flex justify-center">
            <button className="bg-[#f5f5f5] hover:bg-gray-200 text-black px-6 py-2 rounded-md text-sm">start</button>
          </div>
        </div>
      </div>
    </div>
  )
}
