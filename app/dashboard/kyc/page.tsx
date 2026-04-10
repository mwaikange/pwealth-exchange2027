"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Shield, CheckCircle, AlertCircle, Upload, Mail, User, CreditCard, Lock, Eye, EyeOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

interface KYCData {
  level: number
  email_verified: boolean
  mobile_number?: string
  mobile_verified: boolean
  id_number?: string
  home_address?: string
  region?: string
  town?: string
  street?: string
  id_document_uploaded: boolean
  bank_confirmation_uploaded: boolean
  created_at: string
  updated_at: string
}

export default function KYCPage() {
  const { user } = useAuth()
  const [kycData, setKycData] = useState<KYCData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showOTPModal, setShowOTPModal] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    mobileNumber: "",
    idNumber: "",
    region: "",
    town: "",
    street: "",
  })

  const fetchKYCData = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.from("user_kyc").select("*").eq("user_uuid", user.id).single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      if (data) {
        setKycData(data)
        setFormData((prev) => ({
          ...prev,
          mobileNumber: data.mobile_number || "",
          idNumber: data.id_number || "",
          region: data.region || "",
          town: data.town || "",
          street: data.street || "",
        }))
      } else {
        // Create initial KYC record
        const { data: newKyc, error: createError } = await supabase
          .from("user_kyc")
          .insert({
            user_uuid: user.id,
            level: 0,
            email_verified: !!user.email_confirmed_at,
            mobile_verified: false,
            id_document_uploaded: false,
            bank_confirmation_uploaded: false,
          })
          .select()
          .single()

        if (createError) throw createError
        setKycData(newKyc)
      }
    } catch (err: any) {
      console.error("Error fetching KYC data:", err)
      setError(err.message || "Failed to load KYC data")
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match")
      return
    }

    if (formData.newPassword.length < 6) {
      setError("New password must be at least 6 characters long")
      return
    }

    try {
      setSaving(true)
      setError(null)

      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword,
      })

      if (error) throw error

      setSuccess("Password updated successfully")
      setFormData((prev) => ({
        ...prev,
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      }))
    } catch (err: any) {
      setError(err.message || "Failed to update password")
    } finally {
      setSaving(false)
    }
  }

  const handleKYCUpdate = async (level: number) => {
    if (!user || !kycData) return

    try {
      setSaving(true)
      setError(null)

      const updateData: any = {
        level: Math.max(level, kycData.level),
        updated_at: new Date().toISOString(),
      }

      if (level >= 1) {
        updateData.mobile_number = formData.mobileNumber
        updateData.mobile_verified = !!formData.mobileNumber
      }

      if (level >= 2) {
        updateData.id_number = formData.idNumber
        updateData.region = formData.region
        updateData.town = formData.town
        updateData.street = formData.street
      }

      const { data, error } = await supabase
        .from("user_kyc")
        .update(updateData)
        .eq("user_uuid", user.id)
        .select()
        .single()

      if (error) throw error

      setKycData(data)
      setSuccess(`KYC Level ${level} information updated successfully`)
    } catch (err: any) {
      setError(err.message || "Failed to update KYC information")
    } finally {
      setSaving(false)
    }
  }

  const handleDocumentUpload = (type: "id" | "bank") => {
    // Placeholder for document upload - inactive as requested
    setError(`Document upload for ${type === "id" ? "ID/Passport" : "Bank Confirmation"} is not yet available`)
  }

  useEffect(() => {
    fetchKYCData()
  }, [user])

  const getKYCProgress = () => {
    if (!kycData) return 0
    let progress = 0

    if (kycData.email_verified) progress += 15
    if (kycData.mobile_verified) progress += 20
    if (kycData.id_number) progress += 20
    if (kycData.region && kycData.town && kycData.street) progress += 20
    if (kycData.id_document_uploaded) progress += 15
    if (kycData.bank_confirmation_uploaded) progress += 10

    return progress
  }

  const getKYCLevel = () => {
    if (!kycData) return 0

    if (
      kycData.bank_confirmation_uploaded &&
      kycData.id_document_uploaded &&
      kycData.id_number &&
      kycData.region &&
      kycData.mobile_verified &&
      kycData.email_verified
    ) {
      return 3
    }
    if (
      kycData.id_document_uploaded &&
      kycData.id_number &&
      kycData.region &&
      kycData.mobile_verified &&
      kycData.email_verified
    ) {
      return 2
    }
    if (kycData.mobile_verified && kycData.email_verified) {
      return 1
    }
    return 0
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">KYC Verification</h1>
          <p className="text-gray-400 mt-1">Complete your Know Your Customer verification to unlock higher limits</p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-400" />
          <Badge variant="outline" className="text-lg px-4 py-2 border-blue-400 text-blue-400">
            Level {getKYCLevel()}
          </Badge>
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="bg-slate-800 border-slate-700 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            KYC Progress Overview
          </CardTitle>
          <CardDescription>Complete all levels to unlock maximum benefits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">Verification Progress</span>
              <span className="text-slate-300 font-medium">{getKYCProgress()}% Complete</span>
            </div>
            <Progress value={getKYCProgress()} className="h-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="text-center p-4 bg-slate-700 rounded-lg">
                <div className="text-2xl font-bold text-green-400 mb-2">Level 1</div>
                <div className="text-sm text-slate-300 mb-1">Mobile Cashouts Only</div>
                <div className="text-xs text-slate-400">N$200/month • 5% fee</div>
              </div>
              <div className="text-center p-4 bg-slate-700 rounded-lg">
                <div className="text-2xl font-bold text-blue-400 mb-2">Level 2</div>
                <div className="text-sm text-slate-300 mb-1">Enhanced Limits</div>
                <div className="text-xs text-slate-400">N$5,000/week • 3% fee</div>
              </div>
              <div className="text-center p-4 bg-slate-700 rounded-lg">
                <div className="text-2xl font-bold text-purple-400 mb-2">Level 3</div>
                <div className="text-sm text-slate-300 mb-1">Premium + EFT</div>
                <div className="text-xs text-slate-400">N$50,000/day • Reduced fees</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-500">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Password Change & MFA */}
        <Card className="bg-slate-800 border-slate-700 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Security Settings
            </CardTitle>
            <CardDescription>Update your password and enable MFA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* MFA Section */}
            <div className="text-center p-4 bg-slate-700 rounded-lg">
              <h3 className="text-lg font-medium text-white mb-4">Setup MFA</h3>
              <Button
                variant="outline"
                className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500"
                disabled
              >
                Coming Soon
              </Button>
            </div>

            <div className="border-t border-slate-600 pt-6">
              <h3 className="text-lg font-medium text-white mb-4">Change Password</h3>

              {/* User Info */}
              <div className="mb-4 space-y-2 p-3 bg-slate-700 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-green-400">{user?.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-green-400">{user?.email_confirmed_at ? "Verified" : "Unverified"}</span>
                </div>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="relative">
                  <Label htmlFor="oldPassword" className="text-slate-300">
                    Current Password
                  </Label>
                  <Input
                    id="oldPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.oldPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, oldPassword: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Label htmlFor="newPassword" className="text-slate-300">
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, newPassword: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="relative">
                  <Label htmlFor="confirmPassword" className="text-slate-300">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-8 text-slate-400 hover:text-slate-200"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={saving}>
                  {saving ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* KYC Level 1 */}
        <Card className="bg-slate-800 border-slate-700 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              KYC Level 1{getKYCLevel() >= 1 && <CheckCircle className="h-5 w-5 ml-2 text-green-500" />}
            </CardTitle>
            <CardDescription>Basic verification - Personal Details & Mobile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-700 p-4 rounded-lg">
              <h4 className="font-medium text-white mb-2">Level 1 Benefits</h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Mobile cashouts only</li>
                <li>• N$200 per month limit</li>
                <li>• 5% withdrawal fee</li>
              </ul>
            </div>

            {/* User Type Checkbox */}
            <div className="flex items-center space-x-2 p-3 bg-slate-700 rounded-lg">
              <input
                type="checkbox"
                id="userType"
                checked={true}
                disabled
                className="w-4 h-4 text-blue-600 bg-slate-600 border-slate-500 rounded focus:ring-blue-500"
              />
              <Label htmlFor="userType" className="text-slate-300 font-medium">
                Retail User
              </Label>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-slate-300">
                  Email Address
                </Label>
                <div className="flex items-center mt-1">
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-slate-700 border-slate-600 text-slate-200"
                  />
                  {user?.email_confirmed_at && <CheckCircle className="h-5 w-5 ml-2 text-green-500" />}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-slate-300">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter your first name"
                    className="bg-slate-700 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-slate-300">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter your last name"
                    className="bg-slate-700 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dateOfBirth" className="text-slate-300">
                  Date of Birth
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="gender" className="text-slate-300">
                  Gender
                </Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 shadow-xl">
                    <SelectItem value="male" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Male
                    </SelectItem>
                    <SelectItem value="female" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Female
                    </SelectItem>
                    <SelectItem value="other" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Other
                    </SelectItem>
                    <SelectItem
                      value="prefer_not_to_say"
                      className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600"
                    >
                      Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="mobile" className="text-slate-300">
                  Mobile Number
                </Label>
                <div className="flex items-center mt-1">
                  <Input
                    id="mobile"
                    type="tel"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, mobileNumber: e.target.value }))}
                    placeholder="+264 81 123 4567"
                    className="bg-slate-700 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {kycData?.mobile_verified && <CheckCircle className="h-5 w-5 ml-2 text-green-500" />}
                </div>
                <p className="text-xs text-yellow-400 mt-1">
                  ⚠️ This number will be used for mobile payments and cannot be changed later
                </p>
              </div>

              <Button
                onClick={() => setShowOTPModal(true)}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={
                  saving ||
                  !formData.mobileNumber ||
                  !formData.firstName ||
                  !formData.lastName ||
                  !formData.dateOfBirth ||
                  !formData.gender
                }
              >
                {saving ? "Processing..." : "Complete Level 1"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KYC Level 2 */}
        <Card className="bg-slate-800 border-slate-700 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <User className="h-5 w-5 mr-2" />
              KYC Level 2{getKYCLevel() >= 2 && <CheckCircle className="h-5 w-5 ml-2 text-green-500" />}
            </CardTitle>
            <CardDescription>Enhanced verification - Personal Info & ID</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-700 p-4 rounded-lg">
              <h4 className="font-medium text-white mb-2">Level 2 Benefits</h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Mobile cashouts</li>
                <li>• N$5,000 per week limit</li>
                <li>• 3% withdrawal fee</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="idNumber" className="text-slate-300">
                  ID Number
                </Label>
                <Input
                  id="idNumber"
                  value={formData.idNumber}
                  onChange={(e) => setFormData((prev) => ({ ...prev, idNumber: e.target.value }))}
                  placeholder="Enter your ID number"
                  className="bg-slate-700 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="region" className="text-slate-300">
                  Region
                </Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, region: value }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select your region" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 shadow-xl">
                    <SelectItem value="khomas" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Khomas
                    </SelectItem>
                    <SelectItem value="erongo" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Erongo
                    </SelectItem>
                    <SelectItem value="otjozondjupa" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Otjozondjupa
                    </SelectItem>
                    <SelectItem value="oshana" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Oshana
                    </SelectItem>
                    <SelectItem value="omusati" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Omusati
                    </SelectItem>
                    <SelectItem value="oshikoto" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Oshikoto
                    </SelectItem>
                    <SelectItem value="ohangwena" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Ohangwena
                    </SelectItem>
                    <SelectItem value="zambezi" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Zambezi
                    </SelectItem>
                    <SelectItem value="kavango_east" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Kavango East
                    </SelectItem>
                    <SelectItem value="kavango_west" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Kavango West
                    </SelectItem>
                    <SelectItem value="kunene" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Kunene
                    </SelectItem>
                    <SelectItem value="omaheke" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Omaheke
                    </SelectItem>
                    <SelectItem value="hardap" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Hardap
                    </SelectItem>
                    <SelectItem value="karas" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                      Karas
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="town" className="text-slate-300">
                  Town/City
                </Label>
                <Input
                  id="town"
                  value={formData.town}
                  onChange={(e) => setFormData((prev) => ({ ...prev, town: e.target.value }))}
                  placeholder="Enter your town/city"
                  className="bg-slate-700 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="street" className="text-slate-300">
                  Street Address
                </Label>
                <Textarea
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData((prev) => ({ ...prev, street: e.target.value }))}
                  placeholder="Enter your street address"
                  className="bg-slate-700 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-slate-300">ID/Passport Document</Label>
                <Button
                  onClick={() => handleDocumentUpload("id")}
                  variant="outline"
                  className="w-full bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 mt-2"
                  disabled
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload ID Document (Coming Soon)
                </Button>
              </div>

              <Button
                onClick={() => handleKYCUpdate(2)}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={
                  saving ||
                  getKYCLevel() < 1 ||
                  !formData.idNumber ||
                  !formData.region ||
                  !formData.town ||
                  !formData.street
                }
              >
                {saving ? "Updating..." : "Complete Level 2"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KYC Level 3 */}
      <Card className="bg-slate-800 border-slate-700 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            KYC Level 3 - Premium Verification
            {getKYCLevel() >= 3 && <CheckCircle className="h-5 w-5 ml-2 text-green-500" />}
          </CardTitle>
          <CardDescription>Full verification - Bank Confirmation Required</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-700 p-6 rounded-lg">
              <h4 className="font-medium text-white mb-3">Premium Benefits</h4>
              <ul className="text-sm text-slate-300 space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                  Mobile cashouts: N$5,000/day
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                  Bank EFT transfers: N$50,000/day
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                  Reduced fees
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                  Priority support
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Bank Confirmation Letter</Label>
                <p className="text-xs text-slate-400 mb-3">Upload an official bank confirmation letter or statement</p>
                <Button
                  onClick={() => handleDocumentUpload("bank")}
                  variant="outline"
                  className="w-full bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                  disabled
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Bank Document (Coming Soon)
                </Button>
              </div>

              <Button className="w-full bg-purple-600 hover:bg-purple-700" disabled={getKYCLevel() < 2}>
                Complete Level 3 (Coming Soon)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KYC Requirements Summary */}
      <Card className="bg-slate-800 border-slate-700 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">KYC Requirements Summary</CardTitle>
          <CardDescription>Complete overview of all verification levels and their benefits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4 p-4 bg-slate-700 rounded-lg">
              <h4 className="font-medium text-white flex items-center">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white text-sm flex items-center justify-center mr-3">
                  1
                </div>
                Level 1 Requirements
              </h4>
              <ul className="text-sm text-slate-300 space-y-2 ml-11">
                <li className="flex items-center">
                  {user?.email_confirmed_at ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  )}
                  Email verification
                </li>
                <li className="flex items-center">
                  {kycData?.mobile_verified ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  )}
                  Mobile number
                </li>
              </ul>
              <div className="mt-3 p-2 bg-slate-600 rounded text-xs text-slate-300">
                <strong>Benefits:</strong> N$200/month, 5% fee
              </div>
            </div>

            <div className="space-y-4 p-4 bg-slate-700 rounded-lg">
              <h4 className="font-medium text-white flex items-center">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center mr-3">
                  2
                </div>
                Level 2 Requirements
              </h4>
              <ul className="text-sm text-slate-300 space-y-2 ml-11">
                <li className="flex items-center">
                  {kycData?.id_number ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  )}
                  ID Number
                </li>
                <li className="flex items-center">
                  {kycData?.region && kycData?.town && kycData?.street ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  )}
                  Home Address
                </li>
                <li className="flex items-center">
                  {kycData?.id_document_uploaded ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  )}
                  ID Document Upload
                </li>
              </ul>
              <div className="mt-3 p-2 bg-slate-600 rounded text-xs text-slate-300">
                <strong>Benefits:</strong> N$5,000/week, 3% fee
              </div>
            </div>

            <div className="space-y-4 p-4 bg-slate-700 rounded-lg">
              <h4 className="font-medium text-white flex items-center">
                <div className="w-8 h-8 rounded-full bg-purple-500 text-white text-sm flex items-center justify-center mr-3">
                  3
                </div>
                Level 3 Requirements
              </h4>
              <ul className="text-sm text-slate-300 space-y-2 ml-11">
                <li className="flex items-center">
                  {kycData?.bank_confirmation_uploaded ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  )}
                  Bank Confirmation
                </li>
                <li className="text-xs text-slate-400">+ All Level 1 & 2 requirements</li>
              </ul>
              <div className="mt-3 p-2 bg-slate-600 rounded text-xs text-slate-300">
                <strong>Benefits:</strong> N$50,000/day EFT, reduced fees
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* OTP Verification Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Mobile Verification</h3>
            <p className="text-slate-300 mb-4">We've sent a verification code to {formData.mobileNumber}</p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="otpCode" className="text-slate-300">
                  Enter 6-digit code
                </Label>
                <Input
                  id="otpCode"
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="bg-slate-700 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500 text-center text-2xl tracking-widest"
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOTPModal(false)
                    setOtpCode("")
                  }}
                  className="flex-1 bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (otpCode.length === 6) {
                      try {
                        // Simulate OTP verification
                        await new Promise((resolve) => setTimeout(resolve, 1000))
                        await handleKYCUpdate(1)
                        setShowOTPModal(false)
                        setOtpCode("")
                      } catch (error) {
                        setError("OTP verification failed. Please try again.")
                      }
                    } else {
                      setError("Please enter a valid 6-digit code")
                    }
                  }}
                  disabled={otpCode.length !== 6 || saving}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {saving ? "Verifying..." : "Verify"}
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  // Simulate resending OTP
                  setSuccess("New verification code sent!")
                }}
                className="w-full text-blue-400 hover:text-blue-300"
              >
                Resend Code
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
