import type React from "react"
import { DesktopSidebar, MobileTabBar, MobileHeader } from "@/components/app-nav"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh bg-background">
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <MobileTabBar />
      </div>
    </div>
  )
}
