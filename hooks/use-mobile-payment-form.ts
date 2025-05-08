"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  getCountries,
  getBanksForCountry,
  getNetworksForCountry,
  getPaymentConfig,
  getUserPaymentSubmissions,
  submitPayment,
} from "@/actions/payment-actions"
import type { PayCountry, PayBank, PayNetwork, PayConfig, PaySubmission } from "@/types/payment-types"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export function useMobilePaymentForm() {
  // Form state
  const [countries, setCountries] = useState<PayCountry[]>([])
  const [banks, setBanks] = useState<PayBank[]>([])
  const [networks, setNetworks] = useState<PayNetwork[]>([])
  const [config, setConfig] = useState<PayConfig | null>(null)
  const [submissions, setSubmissions] = useState<PaySubmission[]>([])

  // Selected values
  const [selectedCountry, setSelectedCountry] = useState<string>("")
  const [selectedBank, setSelectedBank] = useState<string>("")
  const [selectedNetwork, setSelectedNetwork] = useState<string>("")
  const [paymentNumber, setPaymentNumber] = useState<string>("")

  // Form values
  const [amount, setAmount] = useState<string>("")
  const [name, setName] = useState<string>("")
  const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [referenceNumber, setReferenceNumber] = useState<string>("")
  const [mobileNumber, setMobileNumber] = useState<string>("")
  const [screenshot, setScreenshot] = useState<File | null>(null)

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true) // Assume authenticated by default

  // Create a Supabase client for client-side operations
  const supabase = createClientComponentClient({
    options: {
      global: {
        headers: {
          Accept: "application/json", // Use standard JSON accept header
        },
      },
    },
  })

  // Refresh the session on component mount
  useEffect(() => {
    async function refreshSession() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error("Error refreshing session:", error)
          setIsAuthenticated(false)
          setError("Your session has expired. Please refresh the page and log in again.")
        } else if (!data.session) {
          setIsAuthenticated(false)
          setError("You need to be logged in to use this feature.")
        } else {
          setIsAuthenticated(true)
        }
      } catch (err) {
        console.error("Error in refreshSession:", err)
        setIsAuthenticated(false)
        setError("Failed to verify your login status. Please refresh the page.")
      }
    }

    refreshSession()
  }, [supabase.auth])

  // Load countries on mount
  useEffect(() => {
    async function loadCountries() {
      setIsLoading(true)
      try {
        // First refresh the session
        await supabase.auth.getSession()

        const data = await getCountries()
        setCountries(data)

        // Load submissions - this will return an empty array if not authenticated
        const submissionsData = await getUserPaymentSubmissions()
        setSubmissions(submissionsData)
      } catch (err) {
        console.error("Error in loadCountries:", err)
        if (
          err instanceof Error &&
          (err.message.includes("not authenticated") ||
            err.message.includes("JWT expired") ||
            err.message.includes("Auth session missing") ||
            err.message.includes("session expired"))
        ) {
          setIsAuthenticated(false)
          setError("Your session has expired. Please refresh the page and log in again.")
        } else {
          setError("Failed to load data")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadCountries()
  }, [supabase.auth])

  // Load banks when country changes
  useEffect(() => {
    if (!selectedCountry) {
      setBanks([])
      setNetworks([])
      setConfig(null)
      return
    }

    async function loadBanksAndNetworks() {
      setIsLoading(true)
      try {
        // First refresh the session
        await supabase.auth.getSession()

        const [banksData, networksData, configData] = await Promise.all([
          getBanksForCountry(selectedCountry),
          getNetworksForCountry(selectedCountry),
          getPaymentConfig(selectedCountry),
        ])

        setBanks(banksData)
        setNetworks(networksData)
        setConfig(configData)
      } catch (err) {
        console.error("Error loading banks and networks:", err)

        // Check for auth errors
        if (
          err instanceof Error &&
          (err.message.includes("auth") || err.message.includes("session") || err.message.includes("JWT"))
        ) {
          setIsAuthenticated(false)
          setError("Your session has expired. Please refresh the page and log in again.")
        } else {
          setError("Failed to load banks and networks")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadBanksAndNetworks()
  }, [selectedCountry, supabase.auth])

  // Load payment number and config when bank changes
  useEffect(() => {
    if (!selectedBank || !selectedCountry) {
      setPaymentNumber("")
      return
    }

    async function loadBankDetails() {
      setIsLoading(true)
      try {
        // First refresh the session
        await supabase.auth.getSession()

        const [bankData, configData] = await Promise.all([
          banks.find((bank) => bank.id === selectedBank),
          getPaymentConfig(selectedCountry, selectedBank),
        ])

        if (bankData) {
          setPaymentNumber(bankData.payment_number)
        }

        if (configData) {
          setConfig(configData)
        }
      } catch (err) {
        console.error("Error loading bank details:", err)

        // Check for auth errors
        if (
          err instanceof Error &&
          (err.message.includes("auth") || err.message.includes("session") || err.message.includes("JWT"))
        ) {
          setIsAuthenticated(false)
          setError("Your session has expired. Please refresh the page and log in again.")
        } else {
          setError("Failed to load bank details")
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadBankDetails()
  }, [selectedBank, selectedCountry, banks, supabase.auth])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Refresh the session before submitting
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error || !data.session) {
        setIsAuthenticated(false)
        setError("Your session has expired. Please refresh the page and log in again.")
        return
      }
    } catch (err) {
      console.error("Error refreshing session before submit:", err)
      setIsAuthenticated(false)
      setError("Failed to verify your login status. Please refresh the page.")
      return
    }

    // Validate form
    if (!selectedCountry || !selectedBank || !amount) {
      setError("Please fill in all required fields")
      return
    }

    // Check config requirements
    if (config) {
      if (config.require_name && !name) {
        setError("Name is required")
        return
      }

      if (config.require_date && !transactionDate) {
        setError("Transaction date is required")
        return
      }

      if (config.require_reference && !referenceNumber) {
        setError("Reference number is required")
        return
      }

      if (config.require_mobile && !mobileNumber) {
        setError("Mobile number is required")
        return
      }

      if (config.require_screenshot && !screenshot) {
        setError("Screenshot is required")
        return
      }
    }

    setIsSubmitting(true)

    try {
      // Create form data
      const formData = new FormData()
      formData.append("countryId", selectedCountry)
      formData.append("bankId", selectedBank)

      if (selectedNetwork) {
        formData.append("networkId", selectedNetwork)
      }

      formData.append("name", name)
      formData.append("transactionDate", transactionDate)
      formData.append("referenceNumber", referenceNumber)
      formData.append("amount", amount)

      // Calculate USD amount based on country exchange rate
      const country = countries.find((c) => c.id === selectedCountry)
      const amountUsd = country ? Number.parseFloat(amount) / country.exchange_rate : 0
      formData.append("amountUsd", amountUsd.toString())

      formData.append("mobileNumber", mobileNumber)

      if (screenshot) {
        formData.append("screenshot", screenshot)
      }

      const result = await submitPayment(formData)

      if (result.success) {
        setSuccess(result.message)

        // Reset form
        setAmount("")
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

        // If authentication error, update authentication state
        if (
          result.message.includes("log in") ||
          result.message.includes("session") ||
          result.message.includes("identity") ||
          result.message.includes("authenticated")
        ) {
          setIsAuthenticated(false)
        }
      }
    } catch (err) {
      console.error("Error submitting payment:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to submit payment"
      setError(errorMessage)

      // Check for auth errors in the caught exception
      if (
        err instanceof Error &&
        (errorMessage.includes("auth") ||
          errorMessage.includes("session") ||
          errorMessage.includes("log in") ||
          errorMessage.includes("JWT"))
      ) {
        setIsAuthenticated(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setScreenshot(e.target.files[0])
    }
  }

  return {
    // Data
    countries,
    banks,
    networks,
    config,
    submissions,
    isAuthenticated,

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
    setScreenshot,

    // UI state
    isLoading,
    isSubmitting,
    error,
    success,

    // Handlers
    handleSubmit,
    handleFileChange,
  }
}
