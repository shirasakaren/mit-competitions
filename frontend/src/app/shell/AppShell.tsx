import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Database } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SidebarNav } from './SidebarNav'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { NAV_ITEMS } from './nav'

function Brand() {
  return (
    <div className="flex h-13 items-center gap-2 border-b px-4">
      <Database className="size-4.5 text-foreground" strokeWidth={1.75} />
      <span className="text-sm font-semibold tracking-tight">Customer Intelligence</span>
    </div>
  )
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const current = NAV_ITEMS.find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)))

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-background lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto py-3">
          <SidebarNav />
        </div>
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          v1.0 · 22.4M records
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Brand />
          <div className="flex-1 overflow-y-auto py-3">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-h-dvh flex-1 flex-col lg:pl-60">
        <Topbar onMenuClick={() => setMobileOpen(true)} title={current?.label ?? 'Customer Intelligence'} />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
  )
}
