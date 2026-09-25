'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/store/app-store'
import { useApp } from '@/store/app-store'
import { StatCard, StatusBadge, EmptyState, LoadingBlock, SectionTitle } from '@/components/shared/ui-bits'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SESSION_STATUS, ATTENDANCE_STATUS } from '@/lib/constants'
import { toFa, money, faDate, faDateShort, faMonth, timeAgo, persianWeekday } from '@/lib/fa'
import { useToast } from '@/hooks/use-toast'
import {
  BookOpen, Users, ClipboardCheck, Video, CalendarClock, PiggyBank, Presentation,
  Plus, Loader2, CheckCircle2, Award, Upload, Handshake, GraduationCap, Wallet,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Cls { id: string; name: string; status: string; scheduleDays: string; scheduleTime: string; capacity: number; course: { title: string; coverColor: string }; _count?: { enrollments: number; sessions: number } }
interface Sess { id: string; title: string; date: string; startTime: string; endTime: string; status: string; classGroup: { id: string; name: string; course: { title: string } }; _count?: { attendance: number; recordings: number } }
interface Rec { id: string; title: string; url?: string | null; durationMin: number; createdAt: string; session: { title: string; classGroup: { name: string; course: { title: string } } } }
interface Payroll { id: string; month: string; hoursCount: number; hourlyRate: number; total: number; bonus: number; deduction: number; status: string; paidAt?: string | null }
interface DashData {
  stats: Record<string, number>
  myClasses: Cls[]
  upcomingSessions: Sess[]
  payrolls: Payroll[]
  liveSessions?: Sess[]
}
interface Assignment { id: string; title: string; description?: string | null; dueDate?: string | null; maxScore: number; classGroup: { name: string; course: { title: string } }; _count?: { submissions: number } }
interface Submission { id: string; content?: string | null; score?: number | null; feedback?: string | null; status: string; submittedAt: string; student: { name: string } }
interface Quiz { id: string; title: string; durationMin: number; isActive: boolean; classGroup: { name: string; course: { title: string } }; _count?: { questions: number; attempts: number } }

export default function TeacherView({ view }: { view: string }) {
  const { openLive, user } = useApp()
  const { toast } = useToast()
  const [dash, setDash] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)

  // sessions state
  const [classes, setClasses] = useState<Cls[]>([])
  const [sessions, setSessions] = useState<Sess[]>([])
  const [attSession, setAttSession] = useState<Sess | null>(null)
  const [attStudents, setAttStudents] = useState<{ id: string; name: string }[]>([])
  const [attRecords, setAttRecords] = useState<Record<string, string>>({})

  // assignments
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [newAssign, setNewAssign] = useState({ classGroupId: '', title: '', description: '', dueDate: '', maxScore: '20' })
  const [subDetail, setSubDetail] = useState<{ assignment: Assignment; submissions: Submission[] } | null>(null)
  const [grades, setGrades] = useState<Record<string, { score: string; feedback: string }>>({})

  // quizzes
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [quizDialog, setQuizDialog] = useState(false)
  const [quizForm, setQuizForm] = useState({ classGroupId: '', title: '', durationMin: '10', questions: [{ text: '', options: ['', '', '', ''], correctIndex: 0 }] })

  // recordings
  const [recordings, setRecordings] = useState<Rec[]>([])
  const [recDialog, setRecDialog] = useState(false)
  const [recForm, setRecForm] = useState({ sessionId: '', title: '', url: '', durationMin: '' })

  const loadDash = useCallback(async () => {
    try {
      const d = await api<DashData>('/api/dashboard')
      setDash(d)
      setClasses(d.myClasses || [])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSessions = useCallback(async () => {
    const [s] = await Promise.all([api<{ sessions: Sess[] }>('/api/sessions')])
    setSessions(s.sessions)
  }, [])

  const loadTools = useCallback(async () => {
    const [a, q, r] = await Promise.all([
      api<{ assignments: Assignment[] }>('/api/assignments'),
      api<{ quizzes: Quiz[] }>('/api/quizzes'),
      api<{ recordings: Rec[] }>('/api/recordings'),
    ])
    setAssignments(a.assignments)
    setQuizzes(q.quizzes)
    setRecordings(r.recordings)
  }, [])

  useEffect(() => {
    loadDash()
    if (['sessions', 'assignments', 'recordings'].includes(view)) loadSessions()
    if (view === 'assignments') loadTools()
    if (view === 'salary') {
      // payrolls already in dash
    }
  }, [view, loadDash, loadSessions, loadTools])

  if (loading) return <LoadingBlock rows={6} />
  if (!dash) return <EmptyState title="خطا در دریافت داده‌ها" />

  const totalStudents = dash.stats.students || 0
  const totalPaid = (dash.payrolls || []).filter((p) => p.status === 'PAID').reduce((s, p) => s + p.total, 0)
  const pendingPay = (dash.payrolls || []).filter((p) => p.status !== 'PAID').reduce((s, p) => s + p.total, 0)

  // ---- OVERVIEW ----
  if (view === 'overview') {
    const chart = (dash.payrolls || []).slice().reverse().map((p) => ({ name: faMonth(`${p.month}-01`), درآمد: p.total }))
    return (
      <div className="space-y-6 fade-up">
        {dash.liveSessions && dash.liveSessions.length > 0 && (
          <Card className="border-rose-200 bg-rose-50/70">
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <span className="size-2.5 rounded-full bg-rose-500 live-dot" />
              <p className="text-sm font-bold text-rose-700">کلاس «{dash.liveSessions[0].classGroup.name}» هم‌اکنون لایو است</p>
              <Button size="sm" variant="destructive" className="mr-auto gap-1.5" onClick={() => openLive(dash.liveSessions![0].id)}>
                <Presentation className="size-4" />مدیریت کلاس
              </Button>
            </CardContent>
          </Card>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="کلاس‌های من" value={toFa(dash.stats.classes || 0)} icon={<BookOpen className="size-5" />} tone="teal" />
          <StatCard title="دانشجویان" value={toFa(totalStudents)} icon={<Users className="size-5" />} tone="cyan" />
          <StatCard title="تکالیف در انتظار تصحیح" value={toFa(dash.stats.pendingSubmissions || 0)} icon={<ClipboardCheck className="size-5" />} tone="amber" />
          <StatCard title="ضبط جلسات" value={toFa(dash.stats.recordings || 0)} icon={<Video className="size-5" />} tone="violet" />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CalendarClock className="size-4 text-teal-600" />جلسات پیش‌رو</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 max-h-80 overflow-y-auto chat-scroll">
              {dash.upcomingSessions.length === 0 && <EmptyState title="جلسه‌ای در پیش نیست" />}
              {dash.upcomingSessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <div className="w-12 text-center shrink-0">
                    <p className="text-[10px] text-muted-foreground">{faDateShort(s.date)}</p>
                    <p className="text-xs font-bold">{toFa(s.startTime)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{s.classGroup.course.title}</p>
                    <p className="text-[11px] text-muted-foreground">{s.classGroup.name}</p>
                  </div>
                  {s.status === 'SCHEDULED' && (
                    <Button size="sm" className="h-8 bg-rose-600 hover:bg-rose-700 gap-1" onClick={async () => {
                      await api(`/api/sessions/${s.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'LIVE' }) })
                      openLive(s.id)
                    }}>
                      <span className="size-1.5 rounded-full bg-white live-dot" />لایو
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wallet className="size-4 text-teal-600" />درآمد تدریس (فیش‌های پرداخت‌شده)</CardTitle></CardHeader>
            <CardContent className="h-64" dir="ltr">
              {chart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => new Intl.NumberFormat('fa-IR').format(Math.round(Number(v) / 1e6)) + 'M'} width={40} />
                    <Tooltip formatter={(v: number | string) => money(Number(v))} contentStyle={{ fontFamily: 'inherit', direction: 'rtl', borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="درآمد" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="فیشی صادر نشده" />
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <SectionTitle title="کلاس‌های من" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dash.myClasses.map((c) => (
              <Card key={c.id} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm">{c.name}</p>
                    <StatusBadge label={c.status === 'ACTIVE' ? 'فعال' : c.status === 'PLANNED' ? 'در انتظار' : c.status === 'COMPLETED' ? 'پایان‌یافته' : 'لغو'} color={c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{c.course.title}</p>
                  <div className="flex gap-4 mt-3 text-center text-[11px]">
                    <div className="flex-1 rounded-lg bg-muted/60 py-1.5"><p className="font-extrabold text-sm">{toFa(c._count?.enrollments || 0)}</p><p className="text-muted-foreground">دانشجو</p></div>
                    <div className="flex-1 rounded-lg bg-muted/60 py-1.5"><p className="font-extrabold text-sm">{toFa(c._count?.sessions || 0)}</p><p className="text-muted-foreground">جلسه</p></div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2.5">{c.scheduleDays} · {c.scheduleTime}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ---- CLASSES ----
  if (view === 'classes') {
    return (
      <div className="space-y-4 fade-up">
        <SectionTitle title="کلاس‌های من" sub={`${toFa(classes.length)} کلاس`} />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {classes.map((c) => (
            <Card key={c.id} className="border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="font-bold">{c.name}</p>
                  <StatusBadge label={c.status === 'ACTIVE' ? 'فعال' : c.status === 'PLANNED' ? 'در انتظار' : 'پایان‌یافته'} color={c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{c.course.title}</p>
                <p className="text-[11px] text-teal-700 bg-teal-50 rounded-lg px-2.5 py-1.5 mt-3 inline-block">{c.scheduleDays} · {c.scheduleTime}</p>
                <p className="text-[11px] text-muted-foreground mt-3">{toFa(c._count?.enrollments || 0)} دانشجو · {toFa(c._count?.sessions || 0)} جلسه</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ---- SESSIONS & ATTENDANCE ----
  if (view === 'sessions') {
    return (
      <div className="space-y-4 fade-up">
        <SectionTitle title="جلسات و حضور و غیاب" sub={`${toFa(sessions.length)} جلسه در کلاس‌های شما`} />
        <Card className="border shadow-sm">
          <CardContent className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto chat-scroll">
            {sessions.length === 0 && <EmptyState title="جلسه‌ای یافت نشد" />}
            {sessions.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-2.5 rounded-xl border p-3">
                <div className="w-14 text-center shrink-0">
                  <p className="text-[10px] text-muted-foreground">{persianWeekday(s.date)}</p>
                  <p className="text-xs font-bold">{faDateShort(s.date)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground">{s.classGroup.course.title} · {s.classGroup.name} · {toFa(s.startTime)}–{toFa(s.endTime)}</p>
                </div>
                <StatusBadge label={SESSION_STATUS[s.status]?.label || s.status} color={SESSION_STATUS[s.status]?.color || ''} />
                {s.status === 'SCHEDULED' && (
                  <>
                    <Button size="sm" className="h-8 bg-rose-600 hover:bg-rose-700 gap-1" onClick={async () => {
                      await api(`/api/sessions/${s.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'LIVE' }) })
                      openLive(s.id)
                    }}>
                      <span className="size-1.5 rounded-full bg-white live-dot" />شروع لایو
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => openAttendance(s)}>حضور و غیاب</Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={async () => {
                      await api(`/api/sessions/${s.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }) })
                      toast({ title: 'جلسه تکمیل شد' })
                      loadSessions()
                    }}>تکمیل</Button>
                  </>
                )}
                {s.status === 'COMPLETED' && (
                  <Button size="sm" variant="outline" className="h-8" onClick={() => openAttendance(s)}>مشاهده حضور</Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Dialog open={!!attSession} onOpenChange={(o) => !o && setAttSession(null)}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>حضور و غیاب — {attSession?.title}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              {attStudents.map((st) => (
                <div key={st.id} className="flex items-center justify-between gap-2 rounded-xl border p-2.5">
                  <p className="text-xs font-bold">{st.name}</p>
                  <div className="flex gap-1">
                    {Object.entries(ATTENDANCE_STATUS).map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => setAttRecords({ ...attRecords, [st.id]: k })}
                        className={`text-[10px] rounded-full px-2 py-1 transition-colors ${(attRecords[st.id] || 'PRESENT') === k ? `${v.color} font-bold ring-1 ring-current` : 'bg-muted text-muted-foreground'}`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <Button onClick={saveAttendance} className="w-full gap-2"><CheckCircle2 className="size-4" />ثبت</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ---- ASSIGNMENTS & QUIZZES ----
  if (view === 'assignments') {
    return (
      <div className="space-y-5 fade-up">
        <Tabs defaultValue="assignments">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="assignments">تکالیف</TabsTrigger>
              <TabsTrigger value="quizzes">آزمون‌ها</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Dialog open={!!newAssign.classGroupId || undefined} onOpenChange={(o) => !o && setNewAssign({ ...newAssign, classGroupId: '' })}>
                <Button onClick={() => setNewAssign({ ...newAssign, classGroupId: classes[0]?.id || '' })} className="gap-1.5"><Plus className="size-4" />تکلیف جدید</Button>
                <DialogContent>
                  <DialogHeader><DialogTitle>ایجاد تکلیف جدید</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>کلاس *</Label>
                      <Select value={newAssign.classGroupId} onValueChange={(v) => setNewAssign({ ...newAssign, classGroupId: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label>عنوان *</Label><Input value={newAssign.title} onChange={(e) => setNewAssign({ ...newAssign, title: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>توضیحات</Label><Textarea rows={3} value={newAssign.description} onChange={(e) => setNewAssign({ ...newAssign, description: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label>مهلت ارسال</Label><Input type="date" value={newAssign.dueDate} onChange={(e) => setNewAssign({ ...newAssign, dueDate: e.target.value })} /></div>
                      <div className="space-y-1.5"><Label>بارم (از)</Label><Input type="number" value={newAssign.maxScore} onChange={(e) => setNewAssign({ ...newAssign, maxScore: e.target.value })} /></div>
                    </div>
                    <Button
                      onClick={async () => {
                        try {
                          await api('/api/assignments', {
                            method: 'POST',
                            body: JSON.stringify({ classGroupId: newAssign.classGroupId, title: newAssign.title, description: newAssign.description, dueDate: newAssign.dueDate || undefined, maxScore: Number(newAssign.maxScore) }),
                          })
                          toast({ title: 'تکلیف ثبت شد و به دانشجویان اعلان دادهم' })
                          setNewAssign({ classGroupId: '', title: '', description: '', dueDate: '', maxScore: '20' })
                          loadTools()
                        } catch (e) {
                          toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
                        }
                      }}
                      disabled={!newAssign.title || !newAssign.classGroupId}
                      className="w-full"
                    >
                      ثبت تکلیف
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button onClick={() => setQuizDialog(true)} variant="outline" className="gap-1.5"><ListQuiz className="size-4" />آزمون جدید</Button>
            </div>
          </div>

          <TabsContent value="assignments" className="mt-4 space-y-2.5 max-h-[65vh] overflow-y-auto chat-scroll">
            {assignments.length === 0 && <EmptyState icon={<ClipboardCheck className="size-6" />} title="تکلیفی ثبت نشده" />}
            {assignments.map((a) => (
              <button key={a.id} onClick={() => openSubmissions(a)} className="w-full text-right flex flex-wrap items-center gap-3 rounded-xl border p-3.5 hover:bg-muted/40 transition-colors">
                <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><ClipboardCheck className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">{a.title}</p>
                  <p className="text-[10px] text-muted-foreground">{a.classGroup.course.title} · {a.classGroup.name}{a.dueDate ? ` · مهلت: ${faDate(a.dueDate)}` : ''}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">{toFa(a._count?.submissions || 0)} ارسال</p>
              </button>
            ))}
          </TabsContent>

          <TabsContent value="quizzes" className="mt-4 space-y-2.5 max-h-[65vh] overflow-y-auto chat-scroll">
            {quizzes.length === 0 && <EmptyState icon={<ListQuiz className="size-6" />} title="آزمونی ثبت نشده" />}
            {quizzes.map((q) => (
              <div key={q.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3.5">
                <div className="size-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0"><ListQuiz className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">{q.title}</p>
                  <p className="text-[10px] text-muted-foreground">{q.classGroup.course.title} · {toFa(q._count?.questions || 0)} سوال · {toFa(q.durationMin)} دقیقه · {toFa(q._count?.attempts || 0)} شرکت‌کننده</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={async () => {
                    await api('/api/quizzes', { method: 'PATCH', body: JSON.stringify({ id: q.id, isActive: !q.isActive }) })
                    loadTools()
                  }}
                >
                  {q.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-rose-600" onClick={async () => {
                  await api(`/api/quizzes?id=${q.id}`, { method: 'DELETE' })
                  loadTools()
                }}><TrashIcon /></Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {/* Submissions detail dialog */}
        <Dialog open={!!subDetail} onOpenChange={(o) => !o && setSubDetail(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>ارسالی‌ها — {subDetail?.assignment.title}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {subDetail?.submissions.length === 0 && <EmptyState title="هنوز ارسالی ثبت نشده" />}
              {subDetail?.submissions.map((s) => (
                <div key={s.id} className="rounded-xl border p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold">{s.student.name}</p>
                    <StatusBadge label={s.status === 'GRADED' ? `نمره: ${toFa(s.score || 0)}` : 'در انتظار تصحیح'} color={s.status === 'GRADED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} />
                  </div>
                  {s.content && <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg p-2.5 leading-5">{s.content}</p>}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px]">نمره (از {subDetail.assignment.maxScore})</Label>
                      <Input type="number" className="h-9" value={grades[s.id]?.score ?? ''} onChange={(e) => setGrades({ ...grades, [s.id]: { score: e.target.value, feedback: grades[s.id]?.feedback || '' } })} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px]">بازخورد</Label>
                      <Input className="h-9" value={grades[s.id]?.feedback ?? ''} onChange={(e) => setGrades({ ...grades, [s.id]: { score: grades[s.id]?.score || '', feedback: e.target.value } })} />
                    </div>
                    <Button size="sm" className="h-9" onClick={() => gradeSubmission(s.id)}>ثبت</Button>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Quiz builder */}
        <Dialog open={quizDialog} onOpenChange={setQuizDialog}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>ساخت آزمون چهارگزینه‌ای</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>کلاس *</Label>
                  <Select value={quizForm.classGroupId} onValueChange={(v) => setQuizForm({ ...quizForm, classGroupId: v })}>
                    <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                    <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>مدت (دقیقه)</Label><Input type="number" value={quizForm.durationMin} onChange={(e) => setQuizForm({ ...quizForm, durationMin: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>عنوان آزمون *</Label><Input value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} /></div>

              {quizForm.questions.map((q, qi) => (
                <div key={qi} className="rounded-xl border p-3 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold">سوال {toFa(qi + 1)}</p>
                    {quizForm.questions.length > 1 && (
                      <button onClick={() => setQuizForm({ ...quizForm, questions: quizForm.questions.filter((_, i) => i !== qi) })} className="text-rose-500"><TrashIcon /></button>
                    )}
                  </div>
                  <Input placeholder="متن سوال" value={q.text} onChange={(e) => {
                    const qs = [...quizForm.questions]
                    qs[qi] = { ...q, text: e.target.value }
                    setQuizForm({ ...quizForm, questions: qs })
                  }} />
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          checked={q.correctIndex === oi}
                          onChange={() => {
                            const qs = [...quizForm.questions]
                            qs[qi] = { ...q, correctIndex: oi }
                            setQuizForm({ ...quizForm, questions: qs })
                          }}
                          className="accent-teal-600"
                          title="گزینه صحیح"
                        />
                        <Input className="h-8 text-xs" placeholder={`گزینه ${toFa(oi + 1)}`} value={opt} onChange={(e) => {
                          const qs = [...quizForm.questions]
                          const opts = [...q.options]
                          opts[oi] = e.target.value
                          qs[qi] = { ...q, options: opts }
                          setQuizForm({ ...quizForm, questions: qs })
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setQuizForm({ ...quizForm, questions: [...quizForm.questions, { text: '', options: ['', '', '', ''], correctIndex: 0 }] })}>
                <Plus className="size-3.5" />سوال بعدی
              </Button>
              <Button
                className="w-full"
                onClick={async () => {
                  try {
                    const valid = quizForm.questions.filter((q) => q.text && q.options.every((o) => o))
                    if (!quizForm.title || !quizForm.classGroupId || valid.length === 0) {
                      toast({ title: 'عنوان، کلاس و سوالات کامل الزامی است', variant: 'destructive' })
                      return
                    }
                    await api('/api/quizzes', { method: 'POST', body: JSON.stringify({ ...quizForm, durationMin: Number(quizForm.durationMin), questions: valid }) })
                    toast({ title: 'آزمون فعال شد 🎯', description: 'دانشجویان مطلع شدند' })
                    setQuizDialog(false)
                    setQuizForm({ classGroupId: '', title: '', durationMin: '10', questions: [{ text: '', options: ['', '', '', ''], correctIndex: 0 }] })
                    loadTools()
                  } catch (e) {
                    toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
                  }
                }}
              >
                انتشار آزمون
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ---- RECORDINGS ----
  if (view === 'recordings') {
    return (
      <div className="space-y-4 fade-up">
        <SectionTitle
          title="ضبط جلسات"
          sub="فیلم جلسات را ثبت کنید تا دانشجویان مرور کنند"
          action={<Button onClick={() => setRecDialog(true)} className="gap-1.5"><Plus className="size-4" />ثبت ضبط</Button>}
        />
        <div className="grid md:grid-cols-2 gap-3">
          {recordings.length === 0 && <div className="col-span-full"><EmptyState icon={<Video className="size-6" />} title="ضبطی ثبت نشده" /></div>}
          {recordings.map((r) => (
            <Card key={r.id} className="border shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0"><Video className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground">{r.session.classGroup.course.title} · {r.session.title} · {toFa(r.durationMin)} دقیقه</p>
                  <p className="text-[10px] text-muted-foreground">{faDate(r.createdAt)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={async () => { await api(`/api/recordings?id=${r.id}`, { method: 'DELETE' }); loadTools() }}>
                  <TrashIcon />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={recDialog} onOpenChange={setRecDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>ثبت ضبط جلسه</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>جلسه *</Label>
                <Select value={recForm.sessionId} onValueChange={(v) => setRecForm({ ...recForm, sessionId: v })}>
                  <SelectTrigger><SelectValue placeholder="انتخاب جلسه" /></SelectTrigger>
                  <SelectContent className="max-h-56">
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.classGroup.name} — {s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>عنوان *</Label><Input value={recForm.title} onChange={(e) => setRecForm({ ...recForm, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>لینک ویدیو</Label><Input dir="ltr" placeholder="https://..." value={recForm.url} onChange={(e) => setRecForm({ ...recForm, url: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>مدت (دقیقه)</Label><Input type="number" value={recForm.durationMin} onChange={(e) => setRecForm({ ...recForm, durationMin: e.target.value })} /></div>
              </div>
              <Button
                className="w-full gap-2"
                disabled={!recForm.sessionId || !recForm.title}
                onClick={async () => {
                  try {
                    await api('/api/recordings', {
                      method: 'POST',
                      body: JSON.stringify({ sessionId: recForm.sessionId, title: recForm.title, url: recForm.url, durationMin: Number(recForm.durationMin) }),
                    })
                    toast({ title: 'ضبط جلسه ثبت شد' })
                    setRecDialog(false)
                    setRecForm({ sessionId: '', title: '', url: '', durationMin: '' })
                    loadTools()
                  } catch (e) {
                    toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
                  }
                }}
              >
                <Upload className="size-4" />ثبت
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ---- SALARY ----
  if (view === 'salary') {
    return (
      <div className="space-y-5 fade-up">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="نرخ ساعتی" value={money(user?.teacherProfile?.hourlyRate || 0)} icon={<PiggyBank className="size-5" />} tone="teal" />
          <StatCard title="حقوق دریافتی" value={money(totalPaid)} icon={<CheckCircle2 className="size-5" />} tone="emerald" />
          <StatCard title="در انتظار پرداخت" value={money(pendingPay)} icon={<Wallet className="size-5" />} tone="amber" />
          <StatCard title="تعداد فیش" value={toFa(dash.payrolls?.length || 0)} icon={<GraduationCap className="size-5" />} tone="cyan" />
        </div>
        <Card className="border shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PiggyBank className="size-4 text-teal-600" />فیش‌های حقوقی من</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {(dash.payrolls || []).length === 0 && <EmptyState title="فیشی صادر نشده" />}
            {(dash.payrolls || []).map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3.5">
                <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${p.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  <Award className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">{faMonth(`${p.month}-01`)}</p>
                  <p className="text-[10px] text-muted-foreground">{toFa(Math.round(p.hoursCount))} ساعت × {money(p.hourlyRate)}{p.bonus ? ` + پاداش ${money(p.bonus)}` : ''}{p.deduction ? ` - کسور ${money(p.deduction)}` : ''}</p>
                </div>
                <p className="text-sm font-extrabold">{money(p.total)}</p>
                <StatusBadge label={p.status === 'PAID' ? 'پرداخت‌شده' : 'در انتظار'} color={p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return null

  // ---- helpers ----
  async function openAttendance(s: Sess) {
    try {
      const d = await api<{ session: { classGroup: { enrollments: { student: { id: string; name: string } }[] }; attendance: { studentId: string; status: string }[] } }>(`/api/sessions/${s.id}`)
      const students = d.session.classGroup.enrollments.map((e) => e.student)
      setAttStudents(students)
      const existing: Record<string, string> = {}
      for (const a of d.session.classGroup.attendance || []) existing[a.studentId] = a.status
      setAttRecords(students.length ? existing : {})
      setAttSession(s)
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  async function saveAttendance() {
    if (!attSession) return
    try {
      await api('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({ sessionId: attSession.id, records: attStudents.map((s) => ({ studentId: s.id, status: attRecords[s.id] || 'PRESENT' })) }),
      })
      toast({ title: 'حضور و غیاب ثبت شد ✅' })
      setAttSession(null)
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  async function openSubmissions(a: Assignment) {
    try {
      const d = await api<{ assignment: { submissions: Submission[] } }>(`/api/assignments/${a.id}`)
      setSubDetail({ assignment: a, submissions: d.assignment.submissions })
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  async function gradeSubmission(id: string) {
    const g = grades[id]
    if (!g?.score) return
    try {
      await api(`/api/submissions/${id}`, { method: 'PATCH', body: JSON.stringify({ score: Number(g.score), feedback: g.feedback }) })
      toast({ title: 'نمره ثبت شد و به دانشجو اعلان داده شد' })
      if (subDetail) {
        const d = await api<{ assignment: { submissions: Submission[] } }>(`/api/assignments/${subDetail.assignment.id}`)
        setSubDetail({ ...subDetail, submissions: d.assignment.submissions })
      }
      loadTools()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }
}

function TrashIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
}

function ListQuiz(props: { className?: string }) {
  return <ClipboardCheck className={props.className} />
}
