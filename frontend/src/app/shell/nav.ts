import {
  LayoutDashboard,
  Search,
  ShieldCheck,
  Copy,
  Activity,
  TerminalSquare,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/quality', label: 'Data Quality', icon: ShieldCheck },
  { to: '/duplicates', label: 'Duplicates', icon: Copy },
  { to: '/system', label: 'System', icon: Activity },
  { to: '/api-access', label: 'API Access', icon: TerminalSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
]
