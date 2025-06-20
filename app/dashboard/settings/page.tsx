import { auth } from "@clerk/nextjs"
import { redirect } from "next/navigation"

import { MainNav } from "@/components/main-nav"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"

const SettingsPage = async ({
  params,
}: {
  params: { storeId: string }
}) => {
  const { userId } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  return (
    <div>
      <div className="flex-col">
        <MainNav className="mb-4" />
        <Heading title="Settings" description="Manage store settings" />
        <Separator />
      </div>
    </div>
  )
}

export default SettingsPage
