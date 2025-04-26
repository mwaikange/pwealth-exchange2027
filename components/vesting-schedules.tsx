export function VestingSchedules() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Vesting Schedules</h1>
        <p className="text-gray-400">Manage your investment schedules</p>
      </div>

      <div className="bg-[#2a2d3a] rounded-lg overflow-hidden">
        <div className="flex border-b border-gray-700">
          <button className="flex-1 py-3 px-4 bg-blue-600 text-white font-medium">LEVEL 1</button>
          <button className="flex-1 py-3 px-4 text-gray-300">LEVEL 2</button>
          <button className="flex-1 py-3 px-4 text-gray-300">LEVEL 3</button>
        </div>

        <div className="space-y-4 p-4">
          {[
            {
              id: "LEVEL1-A",
              color: "bg-green-500",
              progress: "78%",
              claimed: true,
              maturity: "15/04/2023 | 5:55:50 pm",
            },
            { id: "LEVEL1-B", color: "bg-blue-500", progress: "0%", claimed: false, maturity: "Not set | Not Set" },
            {
              id: "LEVEL1-C",
              color: "bg-pink-500",
              progress: "100%",
              claimed: false,
              maturity: "16/04/2023 | 9:55:50 pm",
            },
            {
              id: "LEVEL1-D",
              color: "bg-yellow-500",
              progress: "100%",
              claimed: true,
              maturity: "15/04/2023 | 5:55:50 pm",
            },
            {
              id: "LEVEL1-E",
              color: "bg-red-500",
              progress: "0%",
              claimed: false,
              maturity: "15/04/2023 | 5:55:50 pm",
            },
          ].map((item, index) => (
            <div
              key={index}
              className={`border-l-4 ${
                item.color === "bg-green-500"
                  ? "bg-green-500"
                  : item.color === "bg-blue-500"
                    ? "bg-blue-500"
                    : item.color === "bg-pink-500"
                      ? "bg-pink-500"
                      : item.color === "bg-yellow-500"
                        ? "bg-yellow-500"
                        : item.color === "bg-red-500"
                          ? "bg-red-500"
                          : "bg-gray-500"
              } bg-[#1c1e26] p-4 rounded-r-lg`}
            >
              <div className="flex items-start">
                <div className="mr-4">
                  <div className="text-sm text-gray-400">Maturity Date - {item.maturity}</div>
                  <div className="w-10 h-10 rounded-full bg-gray-200 text-black flex items-center justify-center font-bold my-2">
                    2
                  </div>
                  {item.progress !== "0%" && (
                    <div className="text-sm">
                      Maturity Yield: 10 tokens{" "}
                      {item.claimed && <span className="text-green-500">(Claimed on maturity)</span>}
                    </div>
                  )}
                  <div className="text-xs mt-2">
                    Earn 2 PWT tokens every day for 5 days! Claim anytime | Premature claims end vesting schedule |
                    Vesting Schedule Activation Fee is 2 USD in AFT Tokens
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <div className="text-sm">{item.id}</div>
                    <div className="text-sm font-bold">{item.progress}</div>
                  </div>

                  <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
                    <div className="bg-green-500 h-4 rounded-full" style={{ width: item.progress }}></div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    {item.progress !== "0%" && (
                      <>
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm text-gray-300">Fee Paid</span>
                        </div>

                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm text-gray-300">Invested</span>
                        </div>
                      </>
                    )}

                    <button
                      className={`px-4 py-1 rounded text-sm ${item.claimed ? "bg-gray-500" : "bg-green-500 hover:bg-green-600"}`}
                    >
                      {item.progress === "0%"
                        ? item.id === "LEVEL1-E"
                          ? "Activate"
                          : "Invest"
                        : item.claimed
                          ? "Claimed"
                          : "Claim"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
