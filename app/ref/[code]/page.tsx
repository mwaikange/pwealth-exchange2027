import { redirect } from "next/navigation"

export default function ReferralRedirect({ params }: { params: { code: string } }) {
  // Redirect to the registration page with the referral code
  redirect(`/register?ref=${params.code}`)

  // This won't be rendered, but is needed for TypeScript
  return null
}
