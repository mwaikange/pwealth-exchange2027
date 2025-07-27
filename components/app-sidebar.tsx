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
  Users,
  CreditCard,
  BarChart3,
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
          title: "Share Exchange",
          url: "/dashboard/exchange",
        },
      ],
    },
    {
      title: "Vesting",
      url: "/dashboard/vesting",
      icon: Wallet,
      items: [
        {
          title: "Vest Shares for 5 days",
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
      icon: Users,
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
      icon: BarChart3,
      items: [
        {
          title: "Cashout Wallet",
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
      name: "Share Price",
      url: "#",
      icon: Frame,
    },
    {
      name: "Market Data",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Analytics",
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
