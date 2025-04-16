export function SettingsComponent() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400">Change your Password, Setup MFA and Connect with our Groups</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#2a2d3a] rounded-lg p-6">
          <h2 className="text-xl font-bold mb-6 text-center">CUSTOMER SERVICE AGENTS</h2>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10z" />
                </svg>
              </div>
              <button className="bg-[#1c1e26] hover:bg-gray-700 text-white px-4 py-2 rounded w-full">
                Join Telegram Group
              </button>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10z" />
                </svg>
              </div>
              <button className="bg-[#1c1e26] hover:bg-gray-700 text-white px-4 py-2 rounded w-full">
                Talk to AI Agent
              </button>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10z" />
                </svg>
              </div>
              <button className="bg-[#1c1e26] hover:bg-gray-700 text-white px-4 py-2 rounded w-full">
                Talk to AI Agent
              </button>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10z" />
                </svg>
              </div>
              <button className="bg-[#1c1e26] hover:bg-gray-700 text-white px-4 py-2 rounded w-full">
                Join Whatsapp Channel
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#2a2d3a] rounded-lg p-6">
          <div className="mb-6">
            <input
              type="text"
              placeholder="pwt@example.com"
              className="w-full p-3 rounded bg-[#1c1e26] border border-gray-700"
            />
            <p className="mt-2 text-sm text-gray-400">Paste email address OR REFERRAL CODE of your Referral here.</p>
            <p className="mt-1 text-sm text-gray-400">**NB once completed this cant be changed for this account</p>
          </div>

          <div className="flex justify-center mt-4">
            <button className="bg-[#1c1e26] hover:bg-gray-700 text-white px-6 py-2 rounded">Confirm</button>
          </div>
        </div>

        <div className="bg-[#2a2d3a] rounded-lg p-6">
          <div className="mb-6">
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

            <h3 className="text-lg font-medium mb-4">Change Password</h3>

            <div className="space-y-4">
              <input
                type="password"
                placeholder="Old Password"
                className="w-full p-3 rounded bg-[#1c1e26] border border-gray-700"
              />
              <input
                type="password"
                placeholder="New Password"
                className="w-full p-3 rounded bg-[#1c1e26] border border-gray-700"
              />
            </div>
          </div>

          <div className="flex justify-center">
            <button className="bg-[#1c1e26] hover:bg-gray-700 text-white px-6 py-2 rounded">Confirm</button>
          </div>
        </div>

        <div className="bg-[#2a2d3a] rounded-lg p-6">
          <h2 className="text-xl font-bold mb-6 text-center">SETUP MFA</h2>

          <div className="flex justify-center mt-8">
            <button className="bg-[#1c1e26] hover:bg-gray-700 text-white px-6 py-2 rounded">start</button>
          </div>
        </div>
      </div>
    </div>
  )
}
