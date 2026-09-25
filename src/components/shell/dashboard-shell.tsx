'use client'

import { useApp } from '@/store/app-store'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/constants'
import { timeAgo } from '@/lib/fa'
import {
  GraduationCap, LayoutDashboard, Users, Building2, BookOpen, CalendarClock, Wallet, Receipt,
  Landmark, Megaphone, LifeBuoy, Settings, ScrollText, LogOut, Bell, Menu, ChevronDown,
  Presentation, FileBadge, ClipboardCheck, ListChecks, Home, CreditCard, Video, Award, PiggyBank,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface Notif { id: string; title: string; body?: string; type: string; isRead: boolean; createdAt: string }

const MENU: { role: string[]; items: { key: string; label: string; icon: typeof Home }[] }[] = [
  {
    role: ['ADMIN'],
    items: [
      { key: 'overview', label: 'نمای کلی', icon: LayoutDashboard },
      { key: 'users', label: 'کاربران', icon: Users },
      { key: 'structure', label: 'شعب و دوره‌ها', icon: Building2 },
      { key: 'classes', label: 'کلاس‌ها و جلسات', icon: CalendarClock },
      { key: 'enrollments', label: 'ثبت‌نام‌ها', icon: ListChecks },
      { key: 'finance', label: 'مالی و حسابداری', icon: Landmark },
      { key: 'live', label: 'کلاس‌های لایو', icon: Presentation },
      { key: 'comms', label: 'اطلاعیه و تیکت‌ها', icon: Megaphone },
      { key: 'settings', label: 'تنظیمات و گزارش', icon: Settings },
    ],
  },
  {
    role: ['MANAGER'],
    items: [
      { key: 'overview', label: 'نمای کلی', icon: LayoutDashboard },
      { key: 'users', label: 'کاربران شعبه', icon: Users },
      { key: 'structure', label: 'دوره‌ها و سالن‌ها', icon: Building2 },
      { key: 'classes', label: 'کلاس‌ها و جلسات', icon: CalendarClock },
      { key: 'enrollments', label: 'ثبت‌نام‌ها', icon: ListChecks },
      { key: 'finance', label: 'مالی شعبه', icon: Landmark },
      { key: 'live', label: 'کلاس‌های لایو', icon: Presentation },
      { key: 'comms', label: 'اطلاعیه و تیکت‌ها', icon: Megaphone },
    ],
  },
  {
    role: ['STAFF'],
    items: [
      { key: 'overview', label: 'نمای کلی', icon: LayoutDashboard },
      { key: 'users', label: 'دانشجویان', icon: Users },
      { key: 'classes', label: 'کلاس‌ها و جلسات', icon: CalendarClock },
      { key: 'enrollments', label: 'ثبت‌نام و شهریه', icon: ListChecks },
      { key: 'finance', label: 'پرداخت‌ها', icon: CreditCard },
      { key: 'comms', label: 'اطلاعیه و تیکت‌ها', icon: Megaphone },
    ],
  },
  {
    role: ['TEACHER'],
    items: [
      { key: 'overview', label: 'نمای کلی', icon: LayoutDashboard },
      { key: 'classes', label: 'کلاس‌های من', icon: BookOpen },
      { key: 'sessions', label: 'جلسات و حضور', icon: CalendarClock },
      { key: 'assignments', label: 'تکالیف و آزمون', icon: ClipboardCheck },
      { key: 'recordings', label: 'ضبط جلسات', icon: Video },
      { key: 'live', label: 'کلاس لایو', icon: Presentation },
      { key: 'salary', label: 'حقوق و درآمد', icon: PiggyBank },
      { key: 'comms', label: 'اطلاعیه‌ها', icon: Megaphone },
    ],
  },
  {
    role: ['STUDENT'],
    items: [
      { key: 'overview', label: 'نمای کلی', icon: LayoutDashboard },
      { key: 'courses', label: 'دوره‌های من', icon: BookOpen },
      { key: 'schedule', label: 'برنامه هفتگی', icon: CalendarClock },
      { key: 'live', label: 'کلاس لایو', icon: Presentation },
      { key: 'assignments', label: 'تکالیف و آزمون', icon: ClipboardCheck },
      { key: 'payments', label: 'شهریه و پرداخت', icon: CreditCard },
      { key: 'certificates', label: 'گواهینامه‌ها', icon: FileBadge },
      { key: 'comms', label: 'پشتیبانی', icon: LifeBuoy },
    ],
  },
]

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, activeMenu, setActiveMenu, setView } = useApp()
  const { logout } = useAuth()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)

  const menu = MENU.find((m) => m.role.includes(user?.role || '')) || MENU[0]

  const loadNotifs = async () => {
    try {
      const d = await api<{ notifications: Notif[]; unread: number }>('/api/notifications')
      setNotifs(d.notifications)
      setUnread(d.unread)
    } catch { /* silent */ }
  }

  useEffect(() => {
    const t = setTimeout(loadNotifs, 200)
    const i = setInterval(loadNotifs, 30000)
    return () => {
      clearTimeout(t)
      clearInterval(i)
    }
     
  }, [])

  const markAll = async () => {
    await api('/api/notifications', { method: 'PATCH' })
    loadNotifs()
  }

  const go = (key: string) => {
    setActiveMenu(key)
    setMobileNav(false)
    setSheetOpen(false)
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-4 border-b border-sidebar-border">
        <button onClick={() => setView('landing')} className="flex items-center gap-2.5 w-full hover:opacity-90 transition-opacity">
          <div className="size-9 rounded-xl bg-sidebar-primary/90 text-sidebar-primary-foreground flex items-center justify-center shrink-0">
            <GraduationCap className="size-5" />
          </div>
          <div className="text-right min-w-0">
            <p className="font-extrabold text-sm leading-tight">آکادمی نخبگان</p>
            <p className="text-[10px] text-sidebar-foreground/50 mt-0.5">سامانه مدیریت آموزش</p>
          </div>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 chat-scroll">
        {menu.items.map((item) => (
          <button
            key={item.key}
            onClick={() => go(item.key)}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all',
              activeMenu === item.key
                ? 'bg-sidebar-primary/90 text-sidebar-primary-foreground font-bold shadow-md'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <item.icon className="size-4.5 shrink-0" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => { setView('landing') }}
          className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
        >
          <Home className="size-4.5" />
          صفحه اصلی
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 sticky top-0 h-screen">
        {sidebar}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 border-b bg-background/85 backdrop-blur-md flex items-center justify-between px-4 md:px-6 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile nav */}
            <Sheet open={mobileNav} onOpenChange={setMobileNav}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-64">
                <SheetTitle className="sr-only">منو</SheetTitle>
                {sidebar}
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <h1 className="font-bold text-sm md:text-base truncate">
                {menu.items.find((i) => i.key === activeMenu)?.label || 'داشبورد'}
              </h1>
              <p className="text-[10px] md:text-[11px] text-muted-foreground truncate">
                {user?.branchName ? `شعبه: ${user.branchName}` : 'همه شعب'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="size-5" />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -left-0.5 size-4.5 min-w-4.5 h-4.5 px-1 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold">
                      {new Intl.NumberFormat('fa-IR').format(unread)}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-sm font-bold">اعلان‌ها</span>
                  {unread > 0 && (
                    <button onClick={markAll} className="text-[11px] text-teal-600 hover:underline">خواندن همه</button>
                  )}
                </div>
                <DropdownMenuSeparator />
                {notifs.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">اعلانی ندارید</p>}
                {notifs.map((n) => (
                  <DropdownMenuItem key={n.id} className={cn('flex-col items-start gap-0.5 py-2.5', !n.isRead && 'bg-teal-50/60')}>
                    <div className="flex items-center gap-2 w-full">
                      <span className={cn('size-1.5 rounded-full shrink-0', n.isRead ? 'bg-muted-foreground/30' : 'bg-teal-500')} />
                      <span className="text-xs font-bold">{n.title}</span>
                      <span className="text-[9px] text-muted-foreground mr-auto">{timeAgo(n.createdAt)}</span>
                    </div>
                    {n.body && <p className="text-[11px] text-muted-foreground pr-3.5 line-clamp-2">{n.body}</p>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2 h-10">
                  <div className="size-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {user?.name?.charAt(0) || '؟'}
                  </div>
                  <div className="hidden md:block text-right min-w-0">
                    <p className="text-xs font-bold truncate max-w-28">{user?.name}</p>
                    <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[user?.role || '']}</p>
                  </div>
                  <ChevronDown className="size-3.5 text-muted-foreground hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-bold text-sm">{user?.name}</p>
                  <p className="text-[11px] text-muted-foreground font-normal mt-0.5">{ROLE_LABELS[user?.role || '']}{user?.studentProfile ? ` · ${user.studentProfile.studentCode}` : ''}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-rose-600 gap-2 cursor-pointer">
                  <LogOut className="size-4" />
                  خروج از حساب
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">{children}</main>

        <footer className="mt-auto border-t py-4 px-6 text-center text-[11px] text-muted-foreground">
          سامانه جامع مدیریت آموزش آکادمی نخبگان — نسخه ۱.۰
        </footer>
      </div>
    </div>
  )
}
