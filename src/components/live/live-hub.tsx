'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, LoadingBlock, SectionTitle, StatusBadge } from '@/components/shared/ui-bits'
import { SESSION_STATUS } from '@/lib/constants'
import { toFa, faDateShort, persianWeekday } from '@/lib/fa'
import { Presentation, CalendarClock, Radio, Clock3 } from 'lucide-react'

interface Sess {
  id: string; title: string; date: string; startTime: string; endTime: string; status: string
  classGroup: { id: string; name: string; course: { title: string }; teacher?: { name: string } | null }
}

export default function LiveHub() {
  const { openLive, user } = useApp()
  const [sessions, setSessions] = useState<Sess[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const d = await api<{ sessions: Sess[] }>('/api/sessions?status=LIVE')
      const upcoming = await api<{ sessions: Sess[] }>('/api/sessions')
      const live = d.sessions
      const soon = upcoming.sessions
        .filter((s) => s.status === 'SCHEDULED')
        .slice(0, 12)
      setSessions([...live, ...soon])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [load])

  if (loading) return <LoadingBlock rows={5} />

  const live = sessions.filter((s) => s.status === 'LIVE')
  const soon = sessions.filter((s) => s.status === 'SCHEDULED')
  const canHost = ['TEACHER', 'ADMIN', 'MANAGER'].includes(user?.role || '')

  return (
    <div className="space-y-6 fade-up">
      <SectionTitle title="کلاس‌های لایو و پیش‌رو" sub="برای پیوستن یا شروع کلاس، دکمه مربوطه را بزنید" />

      {live.length > 0 && (
        <div>
          <p className="text-sm font-bold text-rose-600 mb-3 flex items-center gap-2">
            <span className="size-2 rounded-full bg-rose-500 live-dot" />
            هم‌اکنون در حال برگزاری
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {live.map((s) => (
              <Card key={s.id} className="border-rose-200 bg-rose-50/50 shadow-sm">
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                  <div className="size-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <Radio className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{s.classGroup.course.title}</p>
                    <p className="text-[11px] text-muted-foreground">{s.title} · {s.classGroup.name}{s.classGroup.teacher ? ` · ${s.classGroup.teacher.name}` : ''}</p>
                  </div>
                  <Button variant="destructive" className="gap-1.5" onClick={() => openLive(s.id)}>
                    <Presentation className="size-4" />
                    {canHost && user?.role === 'TEACHER' ? 'مدیریت کلاس' : 'پیوستن به کلاس'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-bold mb-3 flex items-center gap-2">
          <CalendarClock className="size-4 text-teal-600" />
          جلسات برنامه‌ریزی‌شده
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {soon.length === 0 && live.length === 0 && (
            <div className="col-span-full"><EmptyState icon={<Presentation className="size-6" />} title="جلسه‌ای در پیش نیست" /></div>
          )}
          {soon.map((s) => (
            <Card key={s.id} className="border shadow-sm">
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <div className="w-14 text-center shrink-0">
                  <p className="text-[10px] text-muted-foreground">{persianWeekday(s.date)}</p>
                  <p className="text-xs font-bold">{faDateShort(s.date)}</p>
                  <p className="text-[10px] text-teal-700 font-bold">{toFa(s.startTime)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{s.classGroup.course.title} — {s.title}</p>
                  <p className="text-[10px] text-muted-foreground">{s.classGroup.name}{s.classGroup.teacher ? ` · ${s.classGroup.teacher.name}` : ''}</p>
                </div>
                <StatusBadge label="برنامه‌ریزی‌شده" color={SESSION_STATUS.SCHEDULED.color} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
