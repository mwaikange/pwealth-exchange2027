"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardSidebarItemProps {
  icon: LucideIcon
  label: string
  href: string
  isCollapsed: boolean
  description: string
}

export function DashboardSidebarItem({ icon: Icon, label, href, isCollapsed, description }: DashboardSidebarItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center px-3 py-1.5 rounded",
        isActive ? "bg-yellow-400 text-black" : "text-gray-300 hover:bg-gray-800",
      )}
    >
      <div className="w-5 h-5 mr-2 flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </div>
      {!isCollapsed && (
        <div>
          <div className="font-medium text-xs">{label}</div>
          <div className="text-[9px]">{description}</div>
        </div>
      )}
    </Link>
  )
}
