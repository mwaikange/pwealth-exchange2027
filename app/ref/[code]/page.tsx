import { redirect } from "next/navigation"

interface RefPageProps {
  params: {
    code: string
  }
}

export default function RefPage({ params }: RefPageProps) {
  const { code } = params

  // Redirect to the register page with the referral code as a query parameter
  redirect(`/register?ref=${code}`)
}
