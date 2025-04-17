"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { useWallet } from "@/contexts/wallet-context"
import { useTransactions } from "@/contexts/transaction-context"

export default function Vesting() {
  const [activeTab, setActiveTab] = useState("LEVEL 1")
  const { claimToPwtCashout } = useWallet()
  const { addTransaction } = useTransactions()
  const [claimSuccess, setClaimSuccess] = useState("")

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

  // Function to get the yield amount based on active tab
  const getYieldAmount = () => {
    switch (activeTab) {
      case "LEVEL 1":
        return 10
      case "LEVEL 2":
        return 20
      case "LEVEL 3":
        return 40
      default:
        return 10
    }
  }

  // Handle claim button click
  const handleClaim = (scheduleId: string) => {
    const yieldAmount = getYieldAmount()

    // Update the global wallet state
    claimToPwtCashout(yieldAmount)

    // Log the transaction
    addTransaction({
      type: "CLAIM",
      account: "PWT Cashout",
      amount: yieldAmount,
      amountUsd: yieldAmount * 10,
      description: `CLAIM - ${scheduleId}`,
    })

    // Show success message
    setClaimSuccess(`Successfully claimed ${yieldAmount} PWT from ${scheduleId}`)

    // Clear success message after 3 seconds
    setTimeout(() => {
      setClaimSuccess("")
    }, 3000)

    console.log(`Claimed ${yieldAmount} PWT from ${scheduleId}`)
  }

  return (
    <div className="h-[calc(100vh-130px)] bg-[#1c1e26] overflow-hidden">
      {/* Page Title - adjusted to match other pages */}
      <div className="px-6 mb-2">
        <h1 className="text-2xl font-bold">Vesting Schedules</h1>
        <p className="text-gray-400 text-sm">Manage your investment schedules</p>
      </div>

      {/* Success message */}
      {claimSuccess && <div className="mx-6 mb-2 p-2 bg-green-500 text-white text-sm rounded">{claimSuccess}</div>}

      <div className="px-6 mt-2">
        <div
          className="bg-[#1c1e26] rounded-lg overflow-hidden"
          style={{ transform: "scale(0.95)", transformOrigin: "top left", width: "105%" }}
        >
          {/* Tabs */}
          <div className="flex mb-px">
            <button
              className={`flex-1 py-0 px-4 font-medium text-sm rounded-t-lg ${
                activeTab === "LEVEL 1" ? "bg-[#4285f4] text-white" : "bg-[#1e1e21] text-gray-400"
              }`}
              onClick={() => setActiveTab("LEVEL 1")}
            >
              LEVEL 1
            </button>
            <button
              className={`flex-1 py-0 px-4 font-medium text-sm rounded-t-lg ${
                activeTab === "LEVEL 2" ? "bg-[#4285f4] text-white" : "bg-[#1e1e21] text-gray-400"
              }`}
              onClick={() => setActiveTab("LEVEL 2")}
            >
              LEVEL 2
            </button>
            <button
              className={`flex-1 py-0 px-4 font-medium text-sm rounded-t-lg ${
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
                    <div className="text-xs text-gray-300">
                      Maturity Date -15/04/2025 | 5:55:50 pm | Expected Yield{" "}
                      {activeTab === "LEVEL 1" ? "10" : activeTab === "LEVEL 2" ? "20" : "40"} PWT-Cashout
                    </div>
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
                    <div className="text-xs text-gray-300">
                      Maturity Date -Not set | Not Set | Expected Yield{" "}
                      {activeTab === "LEVEL 1" ? "10" : activeTab === "LEVEL 2" ? "20" : "40"} PWT-Cashout
                    </div>
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
                    Earn {getCircleNumber()} PWT tokens every day for 5 days| Claim anytime | Premature claims end
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
                    <div className="text-xs text-gray-300">
                      Maturity Date -16/04/2025 | 9:55:50 pm | Expected Yield{" "}
                      {activeTab === "LEVEL 1" ? "10" : activeTab === "LEVEL 2" ? "20" : "40"} PWT-Cashout
                    </div>
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
                    Earn {getCircleNumber()} PWT tokens every day for 5 days| Claim anytime | Premature claims end
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
                    <div className="w-4 mr-1.5"></div>
                    <button
                      className="w-20 py-0.5 rounded text-[10px] bg-white text-black"
                      onClick={() => handleClaim(`${activeTab.replace(" ", "")}-C`)}
                    >
                      Claim
                    </button>
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
                    <div className="text-xs text-gray-300">
                      Maturity Date -15/04/2025 | 5:55:50 pm | Expected Yield{" "}
                      {activeTab === "LEVEL 1" ? "10" : activeTab === "LEVEL 2" ? "20" : "40"} PWT-Cashout
                    </div>
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
                    Earn {getCircleNumber()} PWT tokens every day for 5 days| Claim anytime | Premature claims end
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
                    <div className="text-xs text-gray-300">
                      Maturity Date -15/04/2025 | 5:55:50 pm | Expected Yield{" "}
                      {activeTab === "LEVEL 1" ? "10" : activeTab === "LEVEL 2" ? "20" : "40"} PWT-Cashout
                    </div>
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
                    Earn {getCircleNumber()} PWT tokens every day for 5 days| Claim anytime | Premature claims end
                    vesting schedule | Vesting Schedule Activation Fee is 2 USD in AFT Tokens
                  </div>
                </div>

                <div className="ml-4 flex flex-col justify-between items-end">
                  <div className="flex items-center mb-1">
                    <div className="w-4 mr-1.5"></div>
                    <button
                      className="w-20 py-0.5 rounded text-[10px] bg-white text-black"
                      onClick={() => {
                        // Log activation fee transaction
                        addTransaction({
                          type: "ACTIVATE FEE",
                          account: "AFT Wallet",
                          amount: 2,
                          amountUsd: 2,
                          description: `ACTIVATE FEE -${activeTab.replace(" ", "")}-E`,
                        })
                      }}
                    >
                      Activate
                    </button>
                  </div>
                  <div className="flex items-center mb-1">
                    <div className="w-4 mr-1.5"></div>
                    <button
                      className="w-20 py-0.5 rounded text-[10px] bg-gray-600 text-white"
                      onClick={() => {
                        // Log vesting transaction
                        addTransaction({
                          type: "VESTING",
                          account: "PWT Invest",
                          amount: getYieldAmount(),
                          amountUsd: getYieldAmount() * 10,
                          description: `VESTING - ${activeTab.replace(" ", "")}-E`,
                        })
                      }}
                    >
                      Invest
                    </button>
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
    </div>
  )
}
