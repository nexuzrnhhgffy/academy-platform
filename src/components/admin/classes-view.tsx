'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/store/app-store'
import { useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState, LoadingBlock, SectionTitle, StatusBadge, StatCard } from '@/components/shared/ui-bits'
import { CLASS_STATUS, SESSION_STATUS, ATTENDANCE_STATUS, WEEKDAYS } from '@/lib/constants'
import { toFa, money, faDate, faDateShort, persianWeekday } from '@/lib/fa'
import { useToast } from '@/hooks/use-toast'
import {
  CalendarClock, Plus, Trash2, Users, Presentation, GraduationCap, Loader2,
  ClipboardList, CheckCircle2, XCircle, Clock3, BadgeCheck, ListChecks, Video, Handshake,
} from 'lucide-react'

interface Cls {
  id: string; name: string; capacity: number; status: string; scheduleDays: string; scheduleTime: string
  startDate?: string | null; endDate?: string | null
  course: { id: string; title: string; price: number; coverColor: string }
  teacher?: { id: string; name: string } | null
  branch?: { name: string } | null
  room?: { name: string } | null
  _count?: { enrollments: number; sessions: number }
}
interface Sess {
  id: string; title: string; date: string; startTime: string; endTime: string; topic?: string | null; status: string
  _count?: { attendance: number; recordings: number }
}
interface Enr {
  id: string; status: string; discount: number; createdAt: string
  student: { id: string; name: string; phone?: string | null }
  payments: { amount: number; status: string }[]
  installments: { amount: number; status: string }[]
}
interface ClsDetail { sessions: Sess[]; enrollments: Enr[] }
interface Lookup { id: string; name: string; capacity?: number }
interface UserLite { id: string; name: string; role: string }
interface Room { id: string; name: string; branchId: string }

export default function ClassesView() {
  const { user, openLive } = useApp()
  const { toast } = useToast()
  const isStaffish = ['ADMIN', 'MANAGER', 'STAFF'].includes(user?.role || '')
  const [classes, setClasses] = useState<Cls[]>([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<{ cls: Cls; data: ClsDetail } | null>(null)
  const [teachers, setTeachers] = useState<UserLite[]>([])
  const [courses, setCourses] = useState<Lookup[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [branches, setBranches] = useState<Lookup[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', courseId: '', teacherId: '', branchId: '', roomId: '', capacity: '20', startDate: '', scheduleDays: [] as string[], scheduleTime: '16:00 - 18:00', sessionsCount: '12', status: 'PLANNED' })
  const [attSession, setAttSession] = useState<Sess | null>(null)
  const [attRecords, setAttRecords] = useState<Record<string, string>>({})
  const [newSession, setNewSession] = useState({ title: '', date: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (statusFilter !== 'ALL') p.set('status', statusFilter)
      const d = await api<{ classes: Cls[] }>(`/api/classes?${p}`)
      setClasses(d.classes)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api<{ users: UserLite[] }>('/api/users?role=TEACHER').then((d) => setTeachers(d.users)).catch(() => {})
    api<{ courses: Lookup[] }>('/api/courses').then((d) => setCourses(d.courses)).catch(() => {})
    api<{ rooms: Room[] }>('/api/rooms').then((d) => setRooms(d.rooms)).catch(() => {})
    api<{ branches: Lookup[] }>('/api/branches').then((d) => setBranches(d.branches)).catch(() => {})
  }, [])

  const openDetail = async (cls: Cls) => {
    try {
      const d = await api<{ class: ClsDetail }>(`/api/classes/${cls.id}`)
      setDetail({ cls, data: d.class })
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const createClass = async () => {
    setSaving(true)
    try {
      await api('/api/classes', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          generateSessions: true,
          capacity: Number(form.capacity),
          sessionsCount: Number(form.sessionsCount),
          branchId: form.branchId || undefined,
          teacherId: form.teacherId || undefined,
          roomId: form.roomId || undefined,
          startDate: form.startDate || undefined,
        }),
      })
      toast({ title: 'کلاس ایجاد شد', description: 'جلسات به‌صورت خودکار زمان‌بندی شدند' })
      setCreateOpen(false)
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const setClassStatus = async (clsId: string, status: string) => {
    try {
      await api(`/api/classes/${clsId}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      toast({ title: 'وضعیت کلاس تغییر کرد' })
      load()
      if (detail?.cls.id === clsId) setDetail({ ...detail, cls: { ...detail.cls, status } })
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const addSession = async () => {
    if (!detail || !newSession.title || !newSession.date) return
    try {
      await api('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          classGroupId: detail.cls.id, title: newSession.title, date: newSession.date,
          startTime: detail.cls.scheduleTime.split(' - ')[0] || '16:00',
          endTime: detail.cls.scheduleTime.split(' - ')[1] || '18:00',
        }),
      })
      toast({ title: 'جلسه اضافه شد' })
      setNewSession({ title: '', date: '' })
      openDetail(detail.cls)
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const startLive = async (s: Sess) => {
    try {
      await api(`/api/sessions/${s.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'LIVE' }) })
      toast({ title: 'کلاس لایو شروع شد! 🔴', description: 'دانشجویان از طریق اعلان مطلع شدند' })
      openLive(s.id)
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const saveAttendance = async () => {
    if (!attSession || !detail) return
    try {
      await api('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: attSession.id,
          records: detail.data.enrollments.map((e) => ({ studentId: e.student.id, status: attRecords[e.student.id] || 'PRESENT' })),
        }),
      })
      toast({ title: 'حضور و غیاب ثبت شد' })
      setAttSession(null)
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const enrollStudent = async (clsId: string) => {
    const studentId = prompt('شناسه دانشجو؟ (از لیست کاربران)')
    if (!studentId) return
    try {
      await api('/api/enrollments', { method: 'POST', body: JSON.stringify({ studentId, classGroupId: clsId }) })
      toast({ title: 'ثبت‌نام انجام شد' })
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5 fade-up">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="کل کلاس‌ها" value={toFa(classes.length)} icon={<CalendarClock className="size-5" />} tone="teal" />
        <StatCard title="کلاس فعال" value={toFa(classes.filter((c) => c.status === 'ACTIVE').length)} icon={<BadgeCheck className="size-5" />} tone="emerald" />
        <StatCard title="در انتظار شروع" value={toFa(classes.filter((c) => c.status === 'PLANNED').length)} icon={<Clock3 className="size-5" />} tone="amber" />
        <StatCard title="ظرفیت پرشده" value={toFa(classes.reduce((s, c) => s + (c._count?.enrollments || 0), 0))} icon={<Users className="size-5" />} tone="violet" />
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-5">
          <SectionTitle
            title="کلاس‌ها"
            action={
              isStaffish && (
                <Button onClick={() => setCreateOpen(true)} className="gap-1.5"><Plus className="size-4" />کلاس جدید</Button>
              )
            }
          />
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="ALL">همه</TabsTrigger>
              {Object.entries(CLASS_STATUS).map(([k, v]) => <TabsTrigger key={k} value={k}>{v.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>

          {loading ? (
            <LoadingBlock rows={5} />
          ) : classes.length === 0 ? (
            <EmptyState icon={<CalendarClock className="size-6" />} title="کلاسی یافت نشد" />
          ) : (
            <div className="grid md:grid-cols-2 gap-3 max-h-[62vh] overflow-y-auto chat-scroll p-0.5">
              {classes.map((c) => (
                <button key={c.id} onClick={() => openDetail(c)} className="text-right rounded-2xl border p-4 hover:shadow-md hover:border-teal-300 transition-all bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{c.course.title}</p>
                    </div>
                    <StatusBadge label={CLASS_STATUS[c.status]?.label || c.status} color={CLASS_STATUS[c.status]?.color || ''} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><GraduationCap className="size-3" />{c.teacher?.name || 'بدون مدرس'}</span>
                    <span className="flex items-center gap-1"><Users className="size-3" />{toFa(c._count?.enrollments || 0)}/{toFa(c.capacity)}</span>
                    <span className="flex items-center gap-1"><ClipboardList className="size-3" />{toFa(c._count?.sessions || 0)} جلسه</span>
                    {c.room && <span className="flex items-center gap-1"><Video className="size-3" />{c.room.name}</span>}
                  </div>
                  <div className="mt-2 text-[11px] text-teal-700 bg-teal-50 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5">
                    <CalendarClock className="size-3" />
                    {c.scheduleDays || '—'} · {c.scheduleTime || '—'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {detail.cls.name}
                  <StatusBadge label={CLASS_STATUS[detail.cls.status]?.label || ''} color={CLASS_STATUS[detail.cls.status]?.color || ''} />
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[11px]">
                <div className="rounded-xl bg-muted/60 p-2.5"><p className="font-bold text-sm">{detail.cls.course.title}</p><p className="text-muted-foreground mt-0.5">دوره</p></div>
                <div className="rounded-xl bg-muted/60 p-2.5"><p className="font-bold text-sm">{detail.cls.teacher?.name || '—'}</p><p className="text-muted-foreground mt-0.5">مدرس</p></div>
                <div className="rounded-xl bg-muted/60 p-2.5"><p className="font-bold text-sm">{detail.cls.branch?.name || '—'}</p><p className="text-muted-foreground mt-0.5">شعبه</p></div>
                <div className="rounded-xl bg-muted/60 p-2.5"><p className="font-bold text-sm">{money(detail.cls.course.price)}</p><p className="text-muted-foreground mt-0.5">شهریه</p></div>
              </div>

              {isStaffish && (
                <div className="flex flex-wrap gap-2">
                  <Select value={detail.cls.status} onValueChange={(v) => setClassStatus(detail.cls.id, v)}>
                    <SelectTrigger className="w-44 h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CLASS_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Tabs defaultValue="sessions">
                <TabsList className="w-full">
                  <TabsTrigger value="sessions" className="flex-1">جلسات</TabsTrigger>
                  <TabsTrigger value="students" className="flex-1">دانشجویان ({toFa(detail.data.enrollments.length)})</TabsTrigger>
                </TabsList>

                {/* Sessions tab */}
                <TabsContent value="sessions" className="mt-3 space-y-2.5">
                  {isStaffish && (
                    <div className="flex flex-wrap gap-2 items-end rounded-xl bg-muted/50 p-3">
                      <div className="space-y-1"><Label className="text-[11px]">عنوان</Label><Input className="h-9 w-36" placeholder="جلسه جدید" value={newSession.title} onChange={(e) => setNewSession({ ...newSession, title: e.target.value })} /></div>
                      <div className="space-y-1"><Label className="text-[11px]">تاریخ</Label><Input className="h-9 w-36" type="date" value={newSession.date} onChange={(e) => setNewSession({ ...newSession, date: e.target.value })} /></div>
                      <Button size="sm" onClick={addSession} className="gap-1.5"><Plus className="size-3.5" />افزودن</Button>
                    </div>
                  )}
                  {detail.data.sessions.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-2.5 rounded-xl border p-3">
                      <div className="w-14 text-center shrink-0">
                        <p className="text-[10px] text-muted-foreground">{persianWeekday(s.date)}</p>
                        <p className="text-xs font-bold">{faDateShort(s.date)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold">{s.title}</p>
                        <p className="text-[10px] text-muted-foreground">{toFa(s.startTime)} تا {toFa(s.endTime)}{s._count?.attendance ? ` · ${toFa(s._count.attendance)} حضور` : ''}</p>
                      </div>
                      <StatusBadge label={SESSION_STATUS[s.status]?.label || s.status} color={SESSION_STATUS[s.status]?.color || ''} />
                      {s.status === 'LIVE' && (
                        <Button size="sm" variant="destructive" onClick={() => openLive(s.id)} className="gap-1 h-8"><Presentation className="size-3.5" />پیوستن</Button>
                      )}
                      {(s.status === 'SCHEDULED' && (isStaffish || detail.cls.teacher?.id === user?.id)) && (
                        <>
                          <Button size="sm" onClick={() => startLive(s)} className="gap-1 h-8 bg-rose-600 hover:bg-rose-700">
                            <span className="size-1.5 rounded-full bg-white live-dot" />
                            شروع لایو
                          </Button>
                          <Button size="sm" variant="outline" className="h-8" onClick={() => { setAttSession(s); setAttRecords({}) }}>حضور</Button>
                          <Button size="sm" variant="outline" className="h-8" onClick={async () => {
                            await api(`/api/sessions/${s.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }) })
                            toast({ title: 'جلسه تکمیل شد' })
                            openDetail(detail.cls)
                          }}>تکمیل</Button>
                        </>
                      )}
                      {s.status === 'COMPLETED' && (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => { setAttSession(s); setAttRecords({}) }}>مشاهده حضور</Button>
                      )}
                    </div>
                  ))}
                </TabsContent>

                {/* Students tab */}
                <TabsContent value="students" className="mt-3 space-y-2.5">
                  {detail.data.enrollments.length === 0 && <EmptyState title="دانشجویی ثبت‌نام نکرده" />}
                  {detail.data.enrollments.map((e) => {
                    const paid = e.payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0)
                    return (
                      <div key={e.id} className="flex flex-wrap items-center gap-2.5 rounded-xl border p-3">
                        <div className="size-9 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {e.student.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold">{e.student.name}</p>
                          <p className="text-[10px] text-muted-foreground">پرداخته: {money(paid)}{e.student.phone ? ` · ${toFa(e.student.phone)}` : ''}</p>
                        </div>
                        <StatusBadge label={e.status === 'ACTIVE' ? 'فعال' : e.status === 'COMPLETED' ? 'پایان‌یافته' : e.status === 'SUSPENDED' ? 'معلق' : 'لغو'} color={e.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : e.status === 'COMPLETED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'} />
                      </div>
                    )
                  })}
                  {isStaffish && (
                    <Button variant="outline" size="sm" onClick={() => enrollStudent(detail.cls.id)} className="gap-1.5"><Plus className="size-3.5" />ثبت‌نام دانشجو</Button>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Attendance dialog */}
      <Dialog open={!!attSession} onOpenChange={(o) => !o && setAttSession(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>حضور و غیاب — {attSession?.title}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {detail?.data.enrollments.map((e) => (
              <div key={e.student.id} className="flex items-center justify-between gap-2 rounded-xl border p-2.5">
                <p className="text-xs font-bold">{e.student.name}</p>
                <div className="flex gap-1">
                  {Object.entries(ATTENDANCE_STATUS).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setAttRecords({ ...attRecords, [e.student.id]: k })}
                      className={`text-[10px] rounded-full px-2 py-1 transition-colors ${
                        (attRecords[e.student.id] || 'PRESENT') === k ? `${v.color} font-bold ring-1 ring-current` : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <Button onClick={saveAttendance} className="w-full gap-2"><CheckCircle2 className="size-4" />ثبت حضور و غیاب</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create class dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ایجاد کلاس جدید</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>نام کلاس *</Label><Input placeholder="پایتون — گروه B" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>دوره *</Label>
                <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v })}>
                  <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                  <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>مدرس</Label>
                <Select value={form.teacherId || 'none'} onValueChange={(v) => setForm({ ...form, teacherId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>سالن</Label>
                <Select value={form.roomId || 'none'} onValueChange={(v) => setForm({ ...form, roomId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {user?.role === 'ADMIN' && (
                <div className="space-y-1.5">
                  <Label>شعبه</Label>
                  <Select value={form.branchId || 'none'} onValueChange={(v) => setForm({ ...form, branchId: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5"><Label>ظرفیت</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>تاریخ شروع</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>ساعت کلاس</Label><Input placeholder="16:00 - 18:00" value={form.scheduleTime} onChange={(e) => setForm({ ...form, scheduleTime: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>تعداد جلسات</Label><Input type="number" value={form.sessionsCount} onChange={(e) => setForm({ ...form, sessionsCount: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>روزهای هفته</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setForm({ ...form, scheduleDays: form.scheduleDays.includes(d) ? form.scheduleDays.filter((x) => x !== d) : [...form.scheduleDays, d] })}
                    className={`text-[11px] rounded-full px-3 py-1.5 border transition-colors ${form.scheduleDays.includes(d) ? 'bg-teal-600 text-white border-teal-600' : 'bg-background'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><ListChecks className="size-3.5" />جلسات کلاس به‌صورت خودکار هفتگی ساخته می‌شوند</p>
            <Button onClick={createClass} disabled={saving || !form.name || !form.courseId} className="w-full gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              ایجاد کلاس
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
