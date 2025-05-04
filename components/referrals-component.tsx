export function ReferralsComponent() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Referrals</h1>
        <p className="text-gray-400">Claim your referral earnings once your referral has completed Level 1</p>
      </div>

      <div className="bg-[#2a2d3a] rounded-lg p-4">
        <div className="flex justify-center mb-4">
          <div className="inline-flex rounded-md overflow-hidden">
            <button className="bg-white text-black px-4 py-2 text-sm font-medium">All</button>
            <button className="bg-[#1c1e26] text-white px-4 py-2 text-sm font-medium">Claimed</button>
            <button className="bg-[#1c1e26] text-white px-4 py-2 text-sm font-medium">Not Claimed</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Progress</th>
                <th className="text-left py-3 px-4">Register Date</th>
                <th className="text-left py-3 px-4">Claim</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(12)].map((_, index) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="py-3 px-4">mwaikange@gamil.com</td>
                  <td className="py-3 px-4">Active</td>
                  <td className="py-3 px-4">{index % 3 === 0 ? "3/5" : "5/5"}</td>
                  <td className="py-3 px-4">12 May, 5:40pm</td>
                  <td className="py-3 px-4">
                    {index % 3 === 0 ? (
                      <button className="bg-gray-500 text-white px-4 py-1 rounded text-sm">claim</button>
                    ) : (
                      <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded text-sm">
                        {index % 2 === 0 ? "claimed" : ""}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
