export function CashoutComponent() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Cashout</h1>
        <p className="text-gray-400">Cashout by selling tokens & transferring them other users.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#2a2d3a] rounded-lg p-6">
          <h2 className="text-xl font-bold text-yellow-300 mb-2">TRANSFER - ( PWT / FIAT)</h2>
          <p className="text-green-500 mb-4">These transactions are irreversible please read T&C's</p>

          <p className="mb-4">
            Sell tokens in your local currency to friends, family, referrals and your social audience.
          </p>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="enter the email of receiving party"
              className="w-full p-3 rounded bg-[#1c1e26] border border-gray-700"
            />

            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="#Pwt Tokens"
                className="w-full p-3 rounded bg-[#1c1e26] border border-gray-700"
              />
              <input
                type="text"
                placeholder="USD Value"
                className="w-full p-3 rounded bg-[#1c1e26] border border-gray-700"
              />
            </div>

            <div className="flex justify-center">
              <button className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded">
                TRANSFER
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#2a2d3a] rounded-lg p-6">
          <h2 className="text-xl font-bold text-yellow-300 mb-2">GIFT ACTIVATION FEE TOKENS</h2>
          <p className="text-green-500 mb-4">These transactions are irreversible please read T&C's</p>

          <p className="mb-4">Sell or Gift Fee Tokens to your referrals or any member in your community.</p>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="enter the email of the recieving party"
              className="w-full p-3 rounded bg-[#1c1e26] border border-gray-700"
            />

            <input
              type="text"
              placeholder="USD Value"
              className="w-full p-3 rounded bg-[#1c1e26] border border-gray-700"
            />

            <div className="flex justify-center">
              <button className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded">
                TRANSFER
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-[#2a2d3a] rounded-lg p-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody>
              {[...Array(6)].map((_, index) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="py-3 px-4">{index % 2 === 0 ? "OUT-AFT GIFT" : "OUT-TRANSFER"}</td>
                  <td className="py-3 px-4">12 May, 5:40pm</td>
                  <td className="py-3 px-4">80 PWT</td>
                  <td className="py-3 px-4">mwaikange@gmail.com</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
