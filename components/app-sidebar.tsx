"use client"

import type * as React from "react"
import {
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  TrendingUp,
  Wallet,
  CreditCard,
  BarChart3,
  Gift,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "PEER WEALTH",
      logo: GalleryVerticalEnd,
      plan: "Platform",
    },
  ],
  navMain: [
    {
      title: "Overview",
      url: "/dashboard",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Dashboard Overview",
          url: "/dashboard",
        },
      ],
    },
    {
      title: "Exchange",
      url: "/dashboard/exchange",
      icon: TrendingUp,
      items: [
        {
          title: "Buy & Sell Shares",
          url: "/dashboard/exchange",
        },
      ],
    },
    {
      title: "Vesting",
      url: "/dashboard/vesting",
      icon: BarChart3,
      items: [
        {
          title: "Vest Shares for 8 days",
          url: "/dashboard/vesting",
        },
      ],
    },
    {
      title: "Transactions",
      url: "/dashboard/transactions",
      icon: CreditCard,
      items: [
        {
          title: "Transaction History",
          url: "/dashboard/transactions",
        },
      ],
    },
    {
      title: "Referrals",
      url: "/dashboard/referrals",
      icon: Gift,
      items: [
        {
          title: "Referral Program",
          url: "/dashboard/referrals",
        },
      ],
    },
    {
      title: "Cashout",
      url: "/dashboard/cashout",
      icon: Wallet,
      items: [
        {
          title: "Withdraw Funds",
          url: "/dashboard/cashout",
        },
      ],
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings2,
      items: [
        {
          title: "Account Settings",
          url: "/dashboard/settings",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
