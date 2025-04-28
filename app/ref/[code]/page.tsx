import { redirect } from "next/navigation"

// This page handles direct navigation to /ref/[code] URLs
export default function ReferralRedirect({ params }: { params: { code: string } }) {
  // Redirect to the registration page with the referral code as a query parameter
  redirect(`/register?ref=${params.code}`)
}
