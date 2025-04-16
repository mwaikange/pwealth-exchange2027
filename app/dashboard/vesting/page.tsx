"use client"

import { useState } from "react"
import { Check } from "lucide-react"

export default function Vesting() {
  const [activeTab, setActiveTab] = useState("LEVEL 1")

  // Function to get the circle number based on active tab
  const getCircleNumber = () => {
    switch (activeTab) {
      case "LEVEL 1":
        return "2"
      case "LEVEL 2":
        return "4"
      case "LEVEL 3":
        return "8"
      default:
        return "2"
    }
  }

  return (
    <div className="p-2 h-full overflow-hidden bg-[#1c1e26]">
      <div className="mb-2">
        <h1 className="text-xl font-bold">Vesting Schedules</h1>
        <p className="text-gray-400 text-xs">Manage your investment schedules</p>
      </div>

      {/* Apply scaling transformation to the content container and remove left padding to align with heading */}
      <div
        className="bg-[#1c1e26] rounded-lg overflow-hidden"
        style={{ transform: "scale(0.95)", transformOrigin: "top left" }}
      >
        {/* Tabs */}
        <div className="flex mb-px">
          <button
            className={`flex-1 py-2 px-4 font-medium text-sm rounded-t-lg ${
              activeTab === "LEVEL 1" ? "bg-[#4285f4] text-white" : "bg-[#1e1e21] text-gray-400"
            }`}
            onClick={() => setActiveTab("LEVEL 1")}
          >
            LEVEL 1
          </button>
          <button
            className={`flex-1 py-2 px-4 font-medium text-sm rounded-t-lg ${
              activeTab === "LEVEL 2" ? "bg-[#4285f4] text-white" : "bg-[#1e1e21] text-gray-400"
            }`}
            onClick={() => setActiveTab("LEVEL 2")}
          >
            LEVEL 2
          </button>
          <button
            className={`flex-1 py-2 px-4 font-medium text-sm rounded-t-lg ${
              activeTab === "LEVEL 3" ? "bg-[#4285f4] text-white" : "bg-[#1e1e21] text-gray-400"
            }`}
            onClick={() => setActiveTab("LEVEL 3")}
          >
            LEVEL 3
          </button>
        </div>

        {/* Vesting Schedule Cards - with left alignment adjusted */}
        <div className="space-y-[6px] pl-0">
          {/* Card 1 - Green - 78% */}
          <div className="border-l-4 border-green-500 bg-[#1c1e26] relative border-b-2 border-b-green-500">
            <div className="flex py-2 px-4">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-600"></div>
              <div className="absolute left-[10px] top-1/2 transform -translate-y-1/2">
                {/* Vertical line running through the circle */}
                <div className="absolute left-[21px] top-[-10px] w-[1px] h-[60px] bg-gray-600 z-0"></div>
                {/* Circle with number */}
                <div className="relative w-[42px] h-[42px] rounded-full bg-gray-300 text-black flex items-center justify-center font-bold text-2xl z-10">
                  {getCircleNumber()}
                </div>
              </div>

              <div className="ml-20 flex-1">
                <div className="flex justify-between items-start">
                  <div className="text-xs text-gray-300">Maturity Date -15/04/2025 | 5:55:50 pm</div>
                  <div className="text-xs font-medium">|{activeTab.replace(" ", "")}-A</div>
                </div>

                <div className="mt-1.5 w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "78%" }}></div>
                </div>

                <div className="flex justify-between mt-0.5">
                  <div className="text-xs">
                    Maturity Yield:4 tokens | <span className="text-red-400">(Claimed before maturity)</span>
                  </div>
                  <div className="text-xs font-bold text-green-500">78%</div>
                </div>

                <div className="text-[10px] text-gray-300 mt-0.5">
                  Earn {getCircleNumber()} PWT Cashout every day for 5 days| Claim anytime | Premature claims end
                  vesting schedule | Vesting Schedule Activation Fee is 2 USD in AFT Tokens
                </div>
              </div>

              <div className="ml-4 flex flex-col justify-between items-end">
                <div className="flex items-center mb-1">
                  <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center mr-1.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <button className="w-20 py-0.5 rounded text-[10px] bg-gray-500 text-green-300">Fee Paid</button>
                </div>
                <div className="flex items-center mb-1">
                  <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center mr-1.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <button className="w-20 py-0.5 rounded text-[10px] bg-gray-500 text-green-300">Invested</button>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center mr-1.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <button className="w-20 py-0.5 rounded text-[10px] bg-gray-500 text-green-300">Claimed</button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 - Blue - 0% */}
          <div className="border-l-4 border-blue-500 bg-[#1c1e26] relative border-b-2 border-b-blue-500">
            <div className="flex py-2 px-4">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-600"></div>
              <div className="absolute left-[10px] top-1/2 transform -translate-y-1/2">
                {/* Vertical line running through the circle */}
                <div className="absolute left-[21px] top-[-10px] w-[1px] h-[60px] bg-gray-600 z-0"></div>
                {/* Circle with number */}
                <div className="relative w-[42px] h-[42px] rounded-full bg-gray-300 text-black flex items-center justify-center font-bold text-2xl z-10">
                  {getCircleNumber()}
                </div>
              </div>

              <div className="ml-20 flex-1">
                <div className="flex justify-between items-start">
                  <div className="text-xs text-gray-300">Maturity Date -Not set | Not Set</div>
                  <div className="text-xs font-medium">|{activeTab.replace(" ", "")}-B</div>
                </div>

                <div className="mt-1.5 w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-white h-2 rounded-full" style={{ width: "0%" }}></div>
                </div>

                <div className="flex justify-between mt-0.5">
                  <div className="text-xs">&nbsp;</div>
                  <div className="text-xs font-bold text-green-500"></div>
                </div>

                <div className="text-[10px] text-gray-300 mt-0.5">
                  Earn {getCircleNumber()} PWT tokens every day for 5 days| Claim anytime | Premature claims end vesting
                  schedule | Vesting Schedule Activation Fee is 2 USD in AFT Tokens
                </div>
              </div>

              <div className="ml-4 flex flex-col justify-between items-end">
                <div className="flex items-center mb-1">
                  <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center mr-1.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <button className="w-20 py-0.5 rounded text-[10px] bg-gray-500 text-green-300">Fee Paid</button>
                </div>
                <div className="flex items-center mb-1">
                  <div className="w-4 mr-1.5"></div>
                  <button className="w-20 py-0.5 rounded text-[10px] bg-white text-black">Invest</button>
                </div>
                <div className="flex items-center">
                  <div className="w-4 mr-1.5"></div>
                  <button className="w-20 py-0.5 rounded text-[10px] bg-gray-600 text-white">Claim</button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 - Pink - 100% */}
          <div className="border-l-4 border-pink-500 bg-[#1c1e26] relative border-b-2 border-b-pink-500">
            <div className="flex py-2 px-4">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-600"></div>
              <div className="absolute left-[10px] top-1/2 transform -translate-y-1/2">
                {/* Vertical line running through the circle */}
                <div className="absolute left-[21px] top-[-10px] w-[1px] h-[60px] bg-gray-600 z-0"></div>
                {/* Circle with number */}
                <div className="relative w-[42px] h-[42px] rounded-full bg-gray-300 text-black flex items-center justify-center font-bold text-2xl z-10">
                  {getCircleNumber()}
                </div>
              </div>

              <div className="ml-20 flex-1">
                <div className="flex justify-between items-start">
                  <div className="text-xs text-gray-300">Maturity Date -16/04/2025 | 9:55:50 pm</div>
                  <div className="text-xs font-medium">|{activeTab.replace(" ", "")}-C</div>
                </div>

                <div className="mt-1.5 w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "100%" }}></div>
                </div>

                <div className="flex justify-between mt-0.5">
                  <div className="text-xs">Maturity Yield:10 tokens |</div>
                  <div className="text-xs font-bold text-pink-500">100%</div>
                </div>

                <div className="text-[10px] text-gray-300 mt-0.5">
                  Earn {getCircleNumber()} PWT tokens every day for 5 days| Claim anytime | Premature claims end vesting
                  schedule | Vesting Schedule Activation Fee is 2 USD in AFT Tokens
                </div>
              </div>

              <div className="ml-4 flex flex-col justify-between items-end">
                <div className="flex items-center mb-1">
                  <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center mr-1.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <button className="w-20 py-0.5 rounded text-[10px] bg-gray-500 text-green-300">Fee Paid</button>
                </div>
                <div className="flex items-center mb-1">
                  <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center mr-1.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <button className="w-20 py-0.5 rounded text-[10px] bg-gray-500 text-green-300">Invested</button>
                </div>
                <div className="flex items-center">
                  <div className="w-4 mr-1.5"></div>
                  <button className="w-20 py-0.5 rounded text-[10px] bg-white text-black">Claim</button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4 - Yellow - 100% */}
          <div className="border-l-4 border-yellow-500 bg-[#1c1e26] relative border-b-2 border-b-yellow-500">
            <div className="flex py-2 px-4">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-600"></div>
              <div className="absolute left-[10px] top-1/2 transform -translate-y-1/2">
                {/* Vertical line running through the circle */}
                <div className="absolute left-[21px] top-[-10px] w-[1px] h-[60px] bg-gray-600 z-0"></div>
                {/* Circle with number */}
                <div className="relative w-[42px] h-[42px] rounded-full bg-gray-300 text-black flex items-center justify-center font-bold text-2xl z-10">
                  {getCircleNumber()}
                </div>
              </div>

              <div className="ml-20 flex-1">
                <div className="flex justify-between items-start">
                  <div className="text-xs text-gray-300">Maturity Date -15/04/2025 | 5:55:50 pm</div>
                  <div className="text-xs font-medium">|{activeTab.replace(" ", "")}-D</div>
                </div>

                <div className="mt-1.5 w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "100%" }}></div>
                </div>

                <div className="flex justify-between mt-0.5">
                  <div className="text-xs">
                    Maturity Yield:10 tokens | <span className="text-green-500">(Claimed on maturity)</span>
                  </div>
                  <div className="text-xs font-bold text-green-500">100%</div>
                </div>

                <div className="text-[10px] text-gray-300 mt-0.5">
                  Earn {getCircleNumber()} PWT tokens every day for 5 days| Claim anytime | Premature claims end vesting
                  schedule | Vesting Schedule Activation Fee is 2 USD in AFT Tokens
                </div>
              </div>

              <div className="ml-4 flex flex-col justify-between items-end">
                <div className="flex items-center mb-1">
                  <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center mr-1.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <button className="w-20 py-0.5 rounded text-[10px] bg-gray-500 text-green-300">Fee Paid</button>
                </div>
                <div className="flex items-center mb-1">
                  <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center mr-1.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <button className="w-20 py-0.5 rounded text-[10px] bg-gray-500 text-green-300">Invested</button>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center mr-1.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <button className="w-20 py-0.5 rounded text-[10px] bg-gray-500 text-green-300">Claimed</button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5 - Red - 0% */}
          <div className="border-l-4 border-red-500 bg-[#1c1e26] relative border-b-2 border-b-red-500">
            <div className="flex py-2 px-4">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-600"></div>
              <div className="absolute left-[10px] top-1/2 transform -translate-y-1/2">
                {/* Vertical line running through the circle */}
                <div className="absolute left-[21px] top-[-10px] w-[1px] h-[60px] bg-gray-600 z-0"></div>
                {/* Circle with number */}
                <div className="relative w-[42px] h-[42px] rounded-full bg-gray-300 text-black flex items-center justify-center font-bold text-2xl z-10">
                  {getCircleNumber()}
                </div>
              </div>

              <div className="ml-20 flex-1">
                <div className="flex justify-between items-start">
                  <div className="text-xs text-gray-300">Maturity Date -15/04/2025 | 5:55:50 pm</div>
                  <div className="text-xs font-medium">|{activeTab.replace(" ", "")}-E</div>
                </div>

                <div className="mt-1.5 w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-white h-2 rounded-full" style={{ width: "0%" }}></div>
                </div>

                <div className="flex justify-between mt-0.5">
                  <div className="text-xs">&nbsp;</div>
                  <div className="text-xs font-bold text-green-500"></div>
                </div>

                <div className="text-[10px] text-gray-300 mt-0.5">
                  Earn {getCircleNumber()} PWT tokens every day for 5 days| Claim anytime | Premature claims end vesting
                  schedule | Vesting Schedule Activation Fee is 2 USD in AFT Tokens
                </div>
              </div>

              <div className="ml-4 flex flex-col justify-between items-end">
                <div className="flex items-center mb-1">
                  <div className="w-4 mr-1.5"></div>
                  <button className="w-20 py-0.5 rounded text-[10px] bg-white text-black">Activate</button>
                </div>
                <div className="flex items-center mb-1">
                  <div className="w-4 mr-1.5"></div>
                  <button className="w-20 py-0.5 rounded text-[10px] bg-gray-600 text-white">Invest</button>
                </div>
                <div className="flex items-center">
                  <div className="w-4 mr-1.5"></div>
                  <button className="w-20 py-0.5 rounded text-[10px] bg-gray-600 text-white">Claim</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
