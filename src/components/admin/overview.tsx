'use client'

import { useEffect, useState } from 'react'
import { api } from '@/store/app-store'
import { useApp } from '@/store/app-store'
import { StatCard, SectionTitle, StatusBadge, EmptyState, LoadingBlock } from '@/components/shared/ui-bits'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SESSION_STATUS } from '@/lib/constants'
import { money, moneyShort, faDateShort, faDate, toFa, timeAgo } from '@/lib/fa'
import {
  Users, GraduationCap, BookOpen, Wallet, Receipt, ListChecks, CalendarClock,
  Presentation, AlertTriangle, TrendingUp, Megaphone,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

interface DashData {
  role: string
  stats: Record<string, number>
  series: { month: string; income: number; expense?: number }[]
  upcomingSessions: { id: string; title: string; date: string; startTime: string; status: string; classGroup: { name: string; course: { title: string }; teacher?: { name: string } } }[]
  liveSessions: { id: string; title: string; classGroup: { name: string } }[]
  overdueInstallments: { id: string; amount: number; dueDate: string; status: string; enrollment: { student: { name: string }; classGroup: { name: string } } }[]
  announcements: { id: string; title: string; content: string; createdAt: string; createdBy?: { name: string } }[]
}

const MONTHS_FA: Record<string, string> = {
  '01': 'فروردین', '02': 'اردیبهشت', '03': 'خرداد', '04': 'تیر', '05': 'مرداد', '06': 'شهریور',
  '07': 'مهر', '08': 'آبان', '09': 'آذر', '10': 'دی', '11': 'بهمن', '12': 'اسفند',
}
const label = (k: string) => MONTHS_FA[k.split('-')[1]] || k

export default function AdminOverview() {
  const { openLive } = useApp()
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<DashData>('/api/dashboard')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingBlock rows={6} />
  if (!data) return <EmptyState title="خطا در دریافت داده‌ها" sub="صفحه را دوباره بارگذاری کنید" />

  const chartData = data.series.map((s) => ({ name: label(s.month), درآمد: s.income, هزینه: s.expense || 0 }))

  return (
    <div className="space-y-6 fade-up">
      {/* Live alert */}
      {data.liveSessions?.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/70">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <span className="size-2.5 rounded-full bg-rose-500 live-dot shrink-0" />
            <p className="text-sm font-bold text-rose-700">
              {toFa(data.liveSessions.length)} کلاس هم‌اکنون لایو است:
              {data.liveSessions.map((s) => s.classGroup.name).join('، ')}
            </p>
            <Button size="sm" variant="destructive" onClick={() => openLive(data.liveSessions[0].id)} className="mr-auto gap-1.5">
              <Presentation className="size-4" />
              مشاهده
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="دانشجویان فعال" value={toFa(data.stats.students || 0)} icon={<Users className="size-5" />} tone="teal" />
        <StatCard title="اساتید" value={toFa(data.stats.teachers || 0)} icon={<GraduationCap className="size-5" />} tone="cyan" />
        <StatCard title="کلاس‌های فعال" value={toFa(data.stats.activeClasses || 0)} icon={<BookOpen className="size-5" />} tone="emerald" />
        <StatCard title="ثبت‌نام کل" value={toFa(data.stats.enrollments || 0)} icon={<ListChecks className="size-5" />} tone="violet" />
        <StatCard title="درآمد کل" value={moneyShort(data.stats.income || 0)} sub={`${toFa(data.stats.paymentsCount || 0)} پرداخت`} icon={<Wallet className="size-5" />} tone="emerald" />
        <StatCard title="هزینه کل" value={moneyShort(data.stats.expenses || 0)} icon={<Receipt className="size-5" />} tone="rose" />
        <StatCard
          title="سود خالص"
          value={moneyShort((data.stats.income || 0) - (data.stats.expenses || 0))}
          icon={<TrendingUp className="size-5" />}
          tone="teal"
        />
        <StatCard title="جلسات امروز و آینده" value={toFa(data.upcomingSessions?.length || 0)} icon={<CalendarClock className="size-5" />} tone="amber" />
      </div>

      {/* Revenue chart */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <TrendingUp className="size-4 text-teal-600" />
            درآمد ۶ ماه اخیر (تومان)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 md:h-72" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000012" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => moneyShort(Number(v))} width={60} />
              <Tooltip
                formatter={(v: number | string) => money(Number(v))}
                contentStyle={{ fontFamily: 'inherit', direction: 'rtl', borderRadius: 12, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="درآمد" stroke="#0d9488" strokeWidth={2.5} fill="url(#inc)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Upcoming sessions */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <CalendarClock className="size-4 text-teal-600" />
              جلسات پیش‌رو
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 max-h-80 overflow-y-auto chat-scroll">
            {data.upcomingSessions?.length === 0 && <EmptyState title="جلسه‌ای در پیش نیست" />}
            {data.upcomingSessions?.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/40 transition-colors">
                <div className="w-12 text-center shrink-0">
                  <p className="text-[10px] text-muted-foreground">{faDateShort(s.date)}</p>
                  <p className="text-xs font-bold">{toFa(s.startTime)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{s.classGroup?.course?.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{s.classGroup?.name}{s.classGroup?.teacher ? ` · ${s.classGroup.teacher.name}` : ''}</p>
                </div>
                <StatusBadge label={SESSION_STATUS[s.status]?.label || s.status} color={SESSION_STATUS[s.status]?.color || ''} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Overdue installments */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" />
              اقساط معوق و پرداخت‌نشده
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 max-h-80 overflow-y-auto chat-scroll">
            {data.overdueInstallments?.length === 0 && <EmptyState title="قسط معوقی وجود ندارد 🎉" />}
            {data.overdueInstallments?.map((i) => (
              <div key={i.id} className="flex items-center gap-3 rounded-xl border p-3">
                <div className="size-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{i.enrollment?.student?.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{i.enrollment?.classGroup?.name} · سررسید: {faDate(i.dueDate)}</p>
                </div>
                <Badge className={i.status === 'OVERDUE' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'} variant="secondary">
                  {money(i.amount)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <Megaphone className="size-4 text-teal-600" />
            آخرین اطلاعیه‌ها
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3">
          {data.announcements?.length === 0 && <EmptyState title="اطلاعیه‌ای ثبت نشده" />}
          {data.announcements?.map((a) => (
            <div key={a.id} className="rounded-xl border p-4">
              <p className="text-xs font-bold">{a.title}</p>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-5 line-clamp-3">{a.content}</p>
              <p className="text-[10px] text-muted-foreground mt-2">{a.createdBy?.name} · {timeAgo(a.createdAt)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
