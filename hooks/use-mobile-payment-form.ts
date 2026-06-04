"use client"

import type React from "react"
import { useState, useEffect, useCallback, type FormEvent } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import {
  getCountries,
  getBanksForCountry,
  getNetworksForCountry,
  getPaymentConfig,
  getUserPaymentSubmissions,
} from "@/actions/payment-actions-fixed"
import type { PayBank, PayConfig, PayCountry, PayNetwork, PaySubmission } from "@/types/payment-types"
import { submitMobilePayment, refreshUserSession } from "@/actions/mobile-payment-actions"

interface UseMobilePaymentFormProps {
  aftTokenAmount?: string // Add this to accept token amount from parent
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}

export function useMobilePaymentForm({ aftTokenAmount, onSuccess, onError }: UseMobilePaymentFormProps = {}) {
  const router = useRouter()
  const { user, session } = useAuth()
  const [countries, setCountries] = useState<PayCountry[]>([])
  const [banks, setBanks] = useState<PayBank[]>([])
  const [networks, setNetworks] = useState<PayNetwork[]>([])
  const [config, setConfig] = useState<PayConfig | null>(null)
  const [submissions, setSubmissions] = useState<PaySubmission[]>([])
  const [selectedCountry, setSelectedCountry] = useState("")
  const [selectedBank, setSelectedBank] = useState("")
  const [selectedNetwork, setSelectedNetwork] = useState("")
  const [paymentNumber, setPaymentNumber] = useState("")
  const [amount, setAmount] = useState(aftTokenAmount || "")
  const [name, setName] = useState("")
  const [transactionDate, setTransactionDate] = useState(getCurrentDate())
  const [referenceNumber, setReferenceNumber] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isRefreshingSession, setIsRefreshingSession] = useState(false)

  // Create a Supabase client for client-side operations
  const supabase = getSupabaseClient()

  // Update amount when aftTokenAmount changes
  useEffect(() => {
    if (aftTokenAmount) {
      setAmount(aftTokenAmount)
    }
  }, [aftTokenAmount])

  // Get current date in YYYY-MM-DD format
  function getCurrentDate() {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  // Calculate local amount based on USD amount and country exchange rate
  function calculateLocalAmount(usdAmount: string, countryId: string): number {
    const numericAmount = Number.parseFloat(usdAmount) || 0

    // Get exchange rate for the country
    let exchangeRate = 18.5 // Default to Namibian exchange rate
    const country = countries.find((c) => c.id === countryId)
    if (country && country.exchange_rate) {
      exchangeRate = country.exchange_rate
    }

    return numericAmount * exchangeRate
  }

  // Function to check if the user is authenticated
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // First check if we have user and session from context
      if (user && session) {
        console.log("User authenticated from context:", user.id)
        setIsAuthenticated(true)
        return true
      }

      // If not, check with Supabase directly
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error("Error getting session:", error)
        setIsAuthenticated(false)
        return false
      }

      if (!data.session) {
        console.log("No active session")
        setIsAuthenticated(false)
        return false
      }

      // We have a session, check if we have a user
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        console.error("Error getting user:", userError)
        setIsAuthenticated(false)
        return false
      }

      if (!userData.user) {
        console.log("No user found")
        setIsAuthenticated(false)
        return false
      }

      console.log("User authenticated from Supabase:", userData.user.id)
      setIsAuthenticated(true)
      setError(null)
      return true
    } catch (err) {
      console.error("Error in checkAuth:", err)
      setIsAuthenticated(false)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [supabase.auth, user, session])

  // Function to refresh the session
  const refreshSession = useCallback(async () => {
    setIsRefreshingSession(true)
    setError(null)

    try {
      const result = await refreshUserSession()

      if (!result.success) {
        console.error("Error refreshing session:", result.error)
        setError("Failed to refresh your session. Please try logging out and back in.")
        return false
      }

      setError(null)
      setIsAuthenticated(true)
      return true
    } catch (err) {
      console.error("Exception refreshing session:", err)
      setError("An unexpected error occurred. Please try again later.")
      return false
    } finally {
      setIsRefreshingSession(false)
    }
  }, [])

  // Check authentication on mount and when user/session changes
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Load countries on initial render
  useEffect(() => {
    async function loadCountries() {
      try {
        const countriesData = await getCountries()
        setCountries(countriesData)
      } catch (err) {
        console.error("Error loading countries:", err)
        setError("Failed to load countries")
      } finally {
        setIsLoading(false)
      }
    }

    loadCountries()
  }, [])

  // Load user's payment submissions if authenticated
  useEffect(() => {
    async function loadSubmissions() {
      if (isAuthenticated && user?.id) {
        try {
          const submissionsData = await getUserPaymentSubmissions(user.id)
          setSubmissions(submissionsData)
        } catch (err) {
          console.error("Error loading submissions:", err)
        }
      }
    }

    loadSubmissions()
  }, [isAuthenticated, user?.id])

  // Load banks when country changes
  useEffect(() => {
    async function loadBanks() {
      if (selectedCountry) {
        setIsLoading(true)
        try {
          const banksData = await getBanksForCountry(selectedCountry)
          setBanks(banksData)
          setSelectedBank("")
        } catch (err) {
          console.error("Error loading banks:", err)
          setError("Failed to load banks")
        } finally {
          setIsLoading(false)
        }
      } else {
        setBanks([])
        setSelectedBank("")
      }
    }

    async function loadNetworks() {
      if (selectedCountry) {
        try {
          const networksData = await getNetworksForCountry(selectedCountry)
          setNetworks(networksData)
        } catch (err) {
          console.error("Error loading networks:", err)
        }
      } else {
        setNetworks([])
      }
    }

    loadBanks()
    loadNetworks()
  }, [selectedCountry])

  // Load payment config when bank changes
  useEffect(() => {
    async function loadConfig() {
      if (selectedCountry && selectedBank) {
        try {
          const configData = await getPaymentConfig(selectedCountry, selectedBank)
          setConfig(configData)

          // Set payment number from config if available
          if (configData && configData.mobile_number) {
            setPaymentNumber(configData.mobile_number)
          }

          // Set network from config if available
          if (configData && configData.network_id) {
            setSelectedNetwork(configData.network_id.toString())
          }
        } catch (err) {
          console.error("Error loading payment config:", err)
        }
      } else {
        setConfig(null)
        setPaymentNumber("")
      }
    }

    loadConfig()
  }, [selectedCountry, selectedBank])

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setScreenshot(e.target.files[0])
    } else {
      setScreenshot(null)
    }
  }

  // Function to redirect to login
  const redirectToLogin = useCallback(() => {
    router.push("/login?redirect=/dashboard")
  }, [router])

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // Check authentication
      const isAuthValid = await checkAuth()
      if (!isAuthValid) {
        throw new Error("You need to be logged in to submit a payment")
      }

      if (!user?.id) {
        throw new Error("User ID not found. Please log in again.")
      }

      if (!selectedBank) {
        throw new Error("Please select a bank")
      }

      if (!amount || Number(amount) <= 0) {
        throw new Error("Please enter a valid amount")
      }

      if (!screenshot) {
        throw new Error("Please upload a screenshot of your payment")
      }

      // Create form data
      const formData = new FormData()
      formData.append("bankId", selectedBank) // Make sure bank ID is included
      if (selectedCountry) formData.append("countryId", selectedCountry)
      if (selectedNetwork) formData.append("networkId", selectedNetwork)
      if (name) formData.append("name", name)
      if (transactionDate) formData.append("transactionDate", transactionDate)
      if (referenceNumber) formData.append("referenceNumber", referenceNumber)
      formData.append("amount", amount) // This is USD amount

      // Calculate and append local amount
      const localAmount = calculateLocalAmount(amount, selectedCountry)
      formData.append("localAmount", localAmount.toString())

      if (mobileNumber) formData.append("mobileNumber", mobileNumber)
      if (screenshot) formData.append("screenshot", screenshot)

      console.log("Submitting payment with bank ID:", selectedBank)

      // Pass the user ID to the server action
      const result = await submitMobilePayment(user.id, formData)

      if (!result.success) {
        throw new Error(result.message || "Failed to submit payment")
      }

      setSuccess("Payment submitted successfully! We will process it shortly.")

      if (onSuccess) {
        onSuccess(result)
      }

      // Reset form
      setName("")
      setReferenceNumber("")
      setMobileNumber("")
      setScreenshot(null)

      // Reload submissions if authenticated
      if (isAuthenticated && user?.id) {
        const submissionsData = await getUserPaymentSubmissions(user.id)
        setSubmissions(submissionsData)
      }
    } catch (err) {
      console.error("Error submitting payment:", err)
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred"
      setError(errorMessage)

      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    // Form data
    selectedCountry,
    setSelectedCountry,
    selectedBank,
    setSelectedBank,
    selectedNetwork,
    setSelectedNetwork,
    paymentNumber,
    amount,
    setAmount,
    name,
    setName,
    transactionDate,
    setTransactionDate,
    referenceNumber,
    setReferenceNumber: setReferenceNumber,
    mobileNumber,
    setMobileNumber,
    screenshot,

    // Data
    countries,
    banks,
    networks,
    config,
    submissions,

    // UI state
    isLoading,
    isSubmitting,
    error,
    success,
    isAuthenticated,
    isRefreshingSession,

    // Actions
    handleFileChange,
    handleSubmit,
    refreshSession,
    redirectToLogin,
    checkAuth,
    calculateLocalAmount,
  }
}
