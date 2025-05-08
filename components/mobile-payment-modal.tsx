"use client"
import { useMobilePaymentForm } from "@/hooks/use-mobile-payment-form"

interface MobilePaymentModalProps {
  isOpen: boolean
  onClose: () => void
}

export function MobilePaymentModal({ isOpen, onClose }: MobilePaymentModalProps) {
  const {
    // Data
    countries,
    banks,
    networks,
    config,
    submissions,

    // Selected values
    selectedCountry,
    setSelectedCountry,
    selectedBank,
    setSelectedBank,
    selectedNetwork,
    setSelectedNetwork,
    paymentNumber,

    // Form values
    amount,
    setAmount,
    name,
    setName,
    transactionDate,
    setTransactionDate,
    referenceNumber,
    setReferenceNumber,
    mobileNumber,
    setMobileNumber,
    screenshot,

    // UI state
    isLoading,
    isSubmitting,
    error,
    success,

    // Handlers
    handleSubmit,
    handleFileChange,
  } = useMobilePaymentForm()

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-gray-900 text-white">
      {/* Back button */}
      <div className="absolute top-4 left-4">
        <button onClick={() => window.history.back()} className="text-white hover:text-gray-300">
          ←
        </button>
      </div>

      {/* Left side - Payment form */}
      <div className="w-full md:w-1/2 p-4">
        <form onSubmit={handleSubmit}>
          {/* Country and Bank selection */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2">
              <label htmlFor="country" className="block text-sm font-medium">
                Country
              </label>
              <select
                className="bg-[#D9D9D9] rounded p-2 w-full text-black"
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                disabled={isLoading}
              >
                <option value="">Select Country</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-1/2">
              <label htmlFor="bank" className="block text-sm font-medium">
                Bank
              </label>
              <select
                className="bg-[#D9D9D9] rounded p-2 w-full text-black"
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                disabled={!selectedCountry || isLoading}
              >
                <option value="">Select Bank</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium">
              Amount (USD) - local conversion below.
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="50"
              disabled={isLoading || isSubmitting}
            />
          </div>

          <hr className="border-gray-600" />

          {/* Payment number */}
          {selectedBank && paymentNumber && (
            <div>
              <label className="block text-sm font-medium">Make payment to this number:</label>
              <div className="mt-1 block w-full px-3 py-4 bg-gray-700 border border-gray-600 rounded-md text-center text-xl font-bold">
                <p className="text-black text-4xl font-bold text-center">{paymentNumber || "085 8007296"}</p>
              </div>

              {/* Network */}
              {networks.length > 0 && (
                <div className="mt-2">
                  <label className="block text-sm font-medium">Network:</label>
                  <div className="inline-block px-3 py-1 bg-blue-600 rounded-md text-sm font-medium">
                    <p className="text-white text-sm mb-4">
                      Network:{" "}
                      <span className="font-semibold">
                        {networks.length > 0 ? networks[0].name : "Telecom Namibia"}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Name */}
          {(!config || config.require_name) && (
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/2">
                <label htmlFor="name" className="block text-sm font-medium">
                  Name
                  <div className="text-xs text-gray-400">
                    (exactly as it Appears on recipients SMS - Full Name if Required)
                  </div>
                </label>
                <input
                  type="text"
                  className="bg-[#D9D9D9] rounded p-2 w-full text-sm text-black"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Transaction Date */}
              {(!config || config.require_date) && (
                <div className="w-full md:w-1/2">
                  <label htmlFor="transactionDate" className="block text-sm font-medium">
                    Date of Transaction
                    <div className="text-xs text-gray-400">
                      (Must be Today - the transaction must be made the day of submission)
                    </div>
                  </label>
                  <input
                    type="date"
                    className="bg-[#D9D9D9] rounded p-2 w-full text-sm text-black"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </div>
          )}

          {/* Reference Number and Amount (NAD) */}
          <div className="flex flex-col md:flex-row gap-4">
            {(!config || config.require_reference) && (
              <div className="w-full md:w-1/2">
                <label htmlFor="referenceNumber" className="block text-sm font-medium">
                  Reference Number
                </label>
                <input
                  type="text"
                  className="bg-[#D9D9D9] rounded p-2 w-full text-sm text-black"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            )}

            {(!config || config.require_amount) && (
              <div className="w-full md:w-1/2">
                <label htmlFor="amountLocal" className="block text-sm font-medium">
                  Amount (NAD)
                </label>
                <input
                  type="text"
                  id="amountLocal"
                  value={amount ? (Number.parseFloat(amount) * 18).toFixed(2) : ""}
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={true}
                />
              </div>
            )}
          </div>

          {/* Mobile Number and Screenshot */}
          <div className="flex flex-col md:flex-row gap-4">
            {(!config || config.require_mobile) && (
              <div className="w-full md:w-1/2">
                <label htmlFor="mobileNumber" className="block text-sm font-medium">
                  Mobile Number
                </label>
                <input
                  type="text"
                  className="bg-[#D9D9D9] rounded p-2 w-full text-sm h-[34px] text-black"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            )}

            {(!config || config.require_screenshot) && (
              <div className="w-full md:w-1/2">
                <label htmlFor="screenshot" className="block text-sm font-medium">
                  Upload Screenshot
                </label>
                <input
                  type="file"
                  className="text-sm text-black cursor-pointer text-center"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />
              </div>
            )}
          </div>

          {/* Error and Success messages */}
          {error && <div className="bg-red-500 text-white p-2 rounded mb-4">{error}</div>}

          {success && <div className="bg-green-500 text-white p-2 rounded mb-4">{success}</div>}

          {/* Submit button */}
          <div>
            <button
              type="submit"
              className={`font-medium rounded-md py-2 px-8 ${
                screenshot
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-gray-500 text-gray-300 cursor-not-allowed"
              }`}
              disabled={!screenshot || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>

      {/* Right side - Transaction history */}
      <div className="w-full md:w-1/2 p-4">
        <h2 className="text-2xl font-bold mb-4 text-center">Mobile Payments</h2>
        <p className="text-center text-blue-400 mb-4">For: Activation Fee Token (AFT) Purchases</p>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Bank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {submissions.length === 0
                ? // Empty state rows
                  Array(12)
                    .fill(0)
                    .map((_, i) => (
                      <tr key={i} className="border-b border-gray-700">
                        <td className="py-2">Date</td>
                        <td className="py-2">Bank</td>
                        <td className="py-2">Reference</td>
                        <td className="py-2">Amount</td>
                        <td className="py-2">Status</td>
                      </tr>
                    ))
                : // Actual submission data
                  submissions.map((submission) => (
                    <tr key={submission.id} className="border-b border-gray-700">
                      <td className="py-2">{new Date(submission.created_at).toLocaleDateString()}</td>
                      <td className="py-2">
                        {banks.find((b) => b.id === submission.bank_id)?.name || submission.bank_id}
                      </td>
                      <td className="py-2">{submission.reference_number || "-"}</td>
                      <td className="py-2">{submission.amount}</td>
                      <td
                        className={`py-2 ${
                          submission.status === "pending"
                            ? "text-yellow-500"
                            : submission.status === "processed"
                              ? "text-green-500"
                              : "text-red-500"
                        }`}
                      >
                        {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
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
