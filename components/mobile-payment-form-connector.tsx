"use client"

import type React from "react"

import { useEffect, useState } from "react"
import {
  getCountries,
  getBanksForCountry,
  getNetworksForCountry,
  getPaymentConfig,
  getUserPaymentSubmissions,
  submitPayment,
} from "@/actions/payment-actions"
import type { PayCountry, PayBank, PayNetwork, PayConfig, PaySubmission } from "@/types/payment-types"

export function MobilePaymentFormConnector() {
  // Data states
  const [countries, setCountries] = useState<PayCountry[]>([])
  const [banks, setBanks] = useState<PayBank[]>([])
  const [networks, setNetworks] = useState<PayNetwork[]>([])
  const [config, setConfig] = useState<PayConfig | null>(null)
  const [submissions, setSubmissions] = useState<PaySubmission[]>([])

  // Selected values
  const [selectedCountry, setSelectedCountry] = useState<string>("")
  const [selectedBank, setSelectedBank] = useState<string>("")
  const [paymentNumber, setPaymentNumber] = useState<string>("")
  const [networkName, setNetworkName] = useState<string>("")

  // Form values
  const [amount, setAmount] = useState<string>("50")
  const [name, setName] = useState<string>("")
  const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [referenceNumber, setReferenceNumber] = useState<string>("")
  const [mobileNumber, setMobileNumber] = useState<string>("")
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [amountLocal, setAmountLocal] = useState<string>("")

  // UI states
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  // Load countries on mount
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true)
      try {
        const [countriesData, submissionsData] = await Promise.all([getCountries(), getUserPaymentSubmissions()])

        setCountries(countriesData)
        setSubmissions(submissionsData)
      } catch (err) {
        console.error("Failed to load initial data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [])

  // Handle country change
  useEffect(() => {
    if (!selectedCountry) return

    async function loadCountryData() {
      setIsLoading(true)
      try {
        const [banksData, networksData, configData] = await Promise.all([
          getBanksForCountry(selectedCountry),
          getNetworksForCountry(selectedCountry),
          getPaymentConfig(selectedCountry),
        ])

        setBanks(banksData)
        setNetworks(networksData)
        setConfig(configData)

        // Calculate local amount
        const country = countries.find((c) => c.id === selectedCountry)
        if (country && amount) {
          const localAmount = Number.parseFloat(amount) * country.exchange_rate
          setAmountLocal(localAmount.toFixed(2))
        }

        // Reset bank selection
        setSelectedBank("")
        setPaymentNumber("")
        setNetworkName("")
      } catch (err) {
        console.error("Failed to load country data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadCountryData()
  }, [selectedCountry, countries, amount])

  // Handle bank change
  useEffect(() => {
    if (!selectedBank) return

    async function loadBankData() {
      setIsLoading(true)
      try {
        // Get bank details
        const bank = banks.find((b) => b.id === selectedBank)
        if (bank) {
          setPaymentNumber(bank.payment_number)
        }

        // Get bank-specific config if available
        const bankConfig = await getPaymentConfig(selectedCountry, selectedBank)
        if (bankConfig) {
          setConfig(bankConfig)
        }

        // Set network name if we have networks
        if (networks.length > 0) {
          setNetworkName(networks[0].name)
        }
      } catch (err) {
        console.error("Failed to load bank data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadBankData()
  }, [selectedBank, banks, networks, selectedCountry])

  // Handle amount change
  useEffect(() => {
    if (!selectedCountry || !amount) return

    const country = countries.find((c) => c.id === selectedCountry)
    if (country) {
      const localAmount = Number.parseFloat(amount) * country.exchange_rate
      setAmountLocal(localAmount.toFixed(2))
    }
  }, [amount, selectedCountry, countries])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!selectedCountry || !selectedBank || !amount) {
        throw new Error("Please fill in all required fields")
      }

      // Check config requirements
      if (config) {
        if (config.require_name && !name) {
          throw new Error("Name is required")
        }
        if (config.require_date && !transactionDate) {
          throw new Error("Transaction date is required")
        }
        if (config.require_reference && !referenceNumber) {
          throw new Error("Reference number is required")
        }
        if (config.require_mobile && !mobileNumber) {
          throw new Error("Mobile number is required")
        }
        if (config.require_screenshot && !screenshot) {
          throw new Error("Screenshot is required")
        }
      }

      // Create form data
      const formData = new FormData()
      formData.append("countryId", selectedCountry)
      formData.append("bankId", selectedBank)

      if (networks.length > 0) {
        formData.append("networkId", networks[0].id)
      }

      formData.append("name", name)
      formData.append("transactionDate", transactionDate)
      formData.append("referenceNumber", referenceNumber)
      formData.append("amount", amountLocal || "0")
      formData.append("amountUsd", amount)
      formData.append("mobileNumber", mobileNumber)

      if (screenshot) {
        formData.append("screenshot", screenshot)
      }

      const result = await submitPayment(formData)

      if (result.success) {
        setSuccess(true)

        // Reset form
        setAmount("50")
        setName("")
        setTransactionDate(new Date().toISOString().split("T")[0])
        setReferenceNumber("")
        setMobileNumber("")
        setScreenshot(null)

        // Refresh submissions
        const submissionsData = await getUserPaymentSubmissions()
        setSubmissions(submissionsData)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Connect to the existing form elements
  useEffect(() => {
    // Find and connect to the country dropdown
    const countrySelect = document.querySelector('select[name="country"]') as HTMLSelectElement
    if (countrySelect) {
      // Clear existing options
      while (countrySelect.options.length > 1) {
        countrySelect.remove(1)
      }

      // Add country options
      countries.forEach((country) => {
        const option = document.createElement("option")
        option.value = country.id
        option.textContent = country.name
        countrySelect.appendChild(option)
      })

      // Set up event listener
      const originalOnChange = countrySelect.onchange
      countrySelect.onchange = (e) => {
        setSelectedCountry((e.target as HTMLSelectElement).value)
        if (originalOnChange) {
          originalOnChange.call(countrySelect, e)
        }
      }
    }

    // Connect to the bank dropdown
    const bankSelect = document.querySelector('select[name="bank"]') as HTMLSelectElement
    if (bankSelect) {
      // Clear existing options
      while (bankSelect.options.length > 1) {
        bankSelect.remove(1)
      }

      // Add bank options
      banks.forEach((bank) => {
        const option = document.createElement("option")
        option.value = bank.id
        option.textContent = bank.name
        bankSelect.appendChild(option)
      })

      // Set up event listener
      const originalOnChange = bankSelect.onchange
      bankSelect.onchange = (e) => {
        setSelectedBank((e.target as HTMLSelectElement).value)
        if (originalOnChange) {
          originalOnChange.call(bankSelect, e)
        }
      }

      // Disable if no country selected
      bankSelect.disabled = !selectedCountry || isLoading
    }

    // Connect to the payment number display
    const paymentNumberElement = document.getElementById("paymentNumber")
    if (paymentNumberElement) {
      paymentNumberElement.textContent = paymentNumber
    }

    // Connect to the network display
    const networkElement = document.getElementById("networkName")
    if (networkElement) {
      networkElement.textContent = networkName
    }

    // Connect to the amount input
    const amountInput = document.querySelector('input[name="amount"]') as HTMLInputElement
    if (amountInput) {
      amountInput.value = amount
      const originalOnChange = amountInput.onchange
      amountInput.onchange = (e) => {
        setAmount((e.target as HTMLInputElement).value)
        if (originalOnChange) {
          originalOnChange.call(amountInput, e)
        }
      }
    }

    // Connect to the local amount display
    const amountLocalInput = document.querySelector('input[name="amountLocal"]') as HTMLInputElement
    if (amountLocalInput) {
      amountLocalInput.value = amountLocal
    }

    // Connect to other form fields
    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement
    if (nameInput) {
      nameInput.value = name
      nameInput.onchange = (e) => setName((e.target as HTMLInputElement).value)
    }

    const dateInput = document.querySelector('input[name="transactionDate"]') as HTMLInputElement
    if (dateInput) {
      dateInput.value = transactionDate
      dateInput.onchange = (e) => setTransactionDate((e.target as HTMLInputElement).value)
    }

    const referenceInput = document.querySelector('input[name="referenceNumber"]') as HTMLInputElement
    if (referenceInput) {
      referenceInput.value = referenceNumber
      referenceInput.onchange = (e) => setReferenceNumber((e.target as HTMLInputElement).value)
    }

    const mobileInput = document.querySelector('input[name="mobileNumber"]') as HTMLInputElement
    if (mobileInput) {
      mobileInput.value = mobileNumber
      mobileInput.onchange = (e) => setMobileNumber((e.target as HTMLInputElement).value)
    }

    const screenshotInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (screenshotInput) {
      screenshotInput.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files
        if (files && files.length > 0) {
          setScreenshot(files[0])
        }
      }
    }

    // Connect to the form submission
    const form = document.querySelector("form") as HTMLFormElement
    if (form) {
      const originalOnSubmit = form.onsubmit
      form.onsubmit = (e) => {
        e.preventDefault()
        handleSubmit(e)
        if (originalOnSubmit) {
          originalOnSubmit.call(form, e)
        }
      }
    }

    // Update transaction history table
    const tableBody = document.querySelector("table tbody")
    if (tableBody) {
      // Clear existing rows
      tableBody.innerHTML = ""

      // Add submission rows
      if (submissions.length === 0) {
        // Add empty rows if no submissions
        for (let i = 0; i < 12; i++) {
          const tr = document.createElement("tr")

          const dateTd = document.createElement("td")
          dateTd.textContent = "Date"
          tr.appendChild(dateTd)

          const bankTd = document.createElement("td")
          bankTd.textContent = "Bank"
          tr.appendChild(bankTd)

          const refTd = document.createElement("td")
          refTd.textContent = "Reference"
          tr.appendChild(refTd)

          const amountTd = document.createElement("td")
          amountTd.textContent = "Amount"
          tr.appendChild(amountTd)

          const statusTd = document.createElement("td")
          statusTd.textContent = "Status"
          tr.appendChild(statusTd)

          tableBody.appendChild(tr)
        }
      } else {
        // Add actual submission data
        submissions.forEach((submission) => {
          const tr = document.createElement("tr")

          const dateTd = document.createElement("td")
          dateTd.textContent = new Date(submission.created_at).toLocaleDateString()
          tr.appendChild(dateTd)

          const bankTd = document.createElement("td")
          bankTd.textContent = submission.bank_id
          tr.appendChild(bankTd)

          const refTd = document.createElement("td")
          refTd.textContent = submission.reference_number || "-"
          tr.appendChild(refTd)

          const amountTd = document.createElement("td")
          amountTd.textContent = submission.amount.toString()
          tr.appendChild(amountTd)

          const statusTd = document.createElement("td")
          statusTd.textContent = submission.status.charAt(0).toUpperCase() + submission.status.slice(1)

          // Add status color
          if (submission.status === "pending") {
            statusTd.className = "text-yellow-500"
          } else if (submission.status === "processed") {
            statusTd.className = "text-green-500"
          } else {
            statusTd.className = "text-red-500"
          }

          tr.appendChild(statusTd)

          tableBody.appendChild(tr)
        })
      }
    }

    // Display error message if any
    if (error) {
      // Create or update error message element
      let errorElement = document.getElementById("paymentFormError")
      if (!errorElement) {
        errorElement = document.createElement("div")
        errorElement.id = "paymentFormError"
        errorElement.className = "bg-red-500 text-white p-2 rounded mb-4"

        // Insert before the form
        const form = document.querySelector("form")
        if (form && form.parentNode) {
          form.parentNode.insertBefore(errorElement, form)
        }
      }

      errorElement.textContent = error
    } else {
      // Remove error message if no error
      const errorElement = document.getElementById("paymentFormError")
      if (errorElement && errorElement.parentNode) {
        errorElement.parentNode.removeChild(errorElement)
      }
    }

    // Display success message if submission was successful
    if (success) {
      // Create or update success message element
      let successElement = document.getElementById("paymentFormSuccess")
      if (!successElement) {
        successElement = document.createElement("div")
        successElement.id = "paymentFormSuccess"
        successElement.className = "bg-green-500 text-white p-2 rounded mb-4"

        // Insert before the form
        const form = document.querySelector("form")
        if (form && form.parentNode) {
          form.parentNode.insertBefore(successElement, form)
        }
      }

      successElement.textContent = "Payment submitted successfully!"

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } else {
      // Remove success message if not successful
      const successElement = document.getElementById("paymentFormSuccess")
      if (successElement && successElement.parentNode) {
        successElement.parentNode.removeChild(successElement)
      }
    }
  }, [
    countries,
    banks,
    networks,
    selectedCountry,
    selectedBank,
    paymentNumber,
    networkName,
    amount,
    amountLocal,
    name,
    transactionDate,
    referenceNumber,
    mobileNumber,
    submissions,
    error,
    success,
    isLoading,
  ])

  // This component doesn't render anything visible
  // It just connects to the existing UI elements
  return null
}
