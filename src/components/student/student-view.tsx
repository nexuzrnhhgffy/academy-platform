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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toFa, money, moneyShort, faDate, faDateShort, persianWeekday, timeAgo } from '@/lib/fa'
import { INSTALLMENT_STATUS } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import {
  BookOpen, Wallet, FileBadge, ClipboardCheck, CalendarClock, CreditCard, Loader2,
  Presentation, Award, Send, FileQuestion as ListQuiz, GraduationCap, Download, Clock3,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Enr {
  id: string; status: string; discount: number
  classGroup: {
    id: string; name: string; scheduleDays: string; scheduleTime: string; sessions: { id: string; status: string }[]
    course: { title: string; price: number; coverColor: string }
    teacher?: { name: string } | null
  }
  payments: { amount: number; status: string }[]
  installments: { amount: number; status: string; dueDate: string }[]
  certificate?: { code: string } | null
}
interface Sess { id: string; title: string; date: string; startTime: string; endTime: string; status: string; classGroup: { name: string; course: { title: string }; teacher?: { name: string } | null } }
interface Assignment { id: string; title: string; description?: string | null; dueDate?: string | null; maxScore: number; classGroup: { name: string; course: { title: string } }; _count?: { submissions: number }; mySubmission?: { id: string; score?: number | null; feedback?: string | null; status: string } | null }
interface Quiz { id: string; title: string; durationMin: number; classGroup: { name: string; course: { title: string } }; _count?: { questions: number }; myAttempt?: { id: string; score?: number | null } | null }
interface Cert { id: string; code: string; grade?: number | null; issuedAt: string; course?: { title: string } | null }
interface Pay { id: string; amount: number; method: string; refCode?: string | null; paidAt: string; note?: string | null }
interface Inst { id: string; amount: number; dueDate: string; status: string; enrollment: { classGroup: { name: string; course: { title: string } } } }

const colorMap: Record<string, string> = {
  emerald: 'from-emerald-500 to-teal-600', cyan: 'from-cyan-500 to-sky-600', violet: 'from-violet-500 to-purple-600',
  amber: 'from-amber-500 to-orange-600', rose: 'from-rose-500 to-pink-600', teal: 'from-teal-500 to-emerald-600',
}
const PIE_COLORS = ['#0d9488', '#f59e0b', '#ef4444', '#84cc16']

export default function StudentView({ view }: { view: string }) {
  const { openLive } = useApp()
  const { toast } = useToast()
  const [dash, setDash] = useState<{
    stats: Record<string, number>
    enrollments: Enr[]
    upcomingSessions: Sess[]
    liveSessions: Sess[]
    recentPayments: Pay[]
    assignments: Assignment[]
    quizzes: Quiz[]
    certificates: Cert[]
    installments: Inst[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  // assignment submit
  const [subDialog, setSubDialog] = useState<Assignment | null>(null)
  const [subText, setSubText] = useState('')
  const [saving, setSaving] = useState(false)

  // quiz taking
  const [quizDetail, setQuizDetail] = useState<{ quiz: { id: string; title: string; durationMin: number; questions: { id: string; text: string; options: string[] }[] }; myAttempt?: { score?: number | null } | null } | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [quizResult, setQuizResult] = useState<number | null>(null)

  // payment
  const [payDialog, setPayDialog] = useState(false)
  const [payForm, setPayForm] = useState({ installmentId: '', enrollmentId: '', amount: '', method: 'ONLINE' })

  const load = useCallback(async () => {
    try {
      const d = await api<NonNullable<typeof dash>>('/api/dashboard')
      setDash(d)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingBlock rows={6} />
  if (!dash) return <EmptyState title="خطا در دریافت داده‌ها" />

  const totalTuition = dash.enrollments.reduce((s, e) => s + e.classGroup.course.price - e.discount, 0)
  const totalPaid = dash.enrollments.reduce((s, e) => s + e.payments.filter((p) => p.status === 'PAID').reduce((x, p) => x + p.amount, 0), 0)
  const debt = Math.max(totalTuition - totalPaid, 0)
  const payPie = [
    { name: 'پرداخت‌شده', value: totalPaid },
    { name: 'باقی‌مانده', value: debt },
  ]

  // ---------- OVERVIEW ----------
  if (view === 'overview') {
    return (
      <div className="space-y-6 fade-up">
        {dash.liveSessions.length > 0 && (
          <Card className="border-rose-200 bg-rose-50/70">
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <span className="size-2.5 rounded-full bg-rose-500 live-dot" />
              <p className="text-sm font-bold text-rose-700">کلاس «{dash.liveSessions[0].classGroup?.name}» هم‌اکنون لایو است!</p>
              <Button size="sm" variant="destructive" className="mr-auto gap-1.5" onClick={() => openLive(dash.liveSessions[0].id)}>
                <Presentation className="size-4" />ورود به کلاس لایو
              </Button>
            </CardContent>
          </Card>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="دوره‌های من" value={toFa(dash.stats.courses || 0)} icon={<BookOpen className="size-5" />} tone="teal" />
          <StatCard title="تکالیف باز" value={toFa(dash.stats.pendingAssignments || 0)} icon={<ClipboardCheck className="size-5" />} tone="amber" />
          <StatCard title="بدهی من" value={moneyShort(dash.stats.debt || 0)} icon={<Wallet className="size-5" />} tone={debt > 0 ? 'rose' : 'emerald'} />
          <StatCard title="گواهینامه‌ها" value={toFa(dash.stats.certificates || 0)} icon={<FileBadge className="size-5" />} tone="violet" />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CalendarClock className="size-4 text-teal-600" />جلسات پیش‌رو</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 max-h-80 overflow-y-auto chat-scroll">
              {dash.upcomingSessions.length === 0 && <EmptyState title="جلسه‌ای در پیش نیست" />}
              {dash.upcomingSessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <div className="w-14 text-center shrink-0">
                    <p className="text-[10px] text-muted-foreground">{persianWeekday(s.date)}</p>
                    <p className="text-xs font-bold">{faDateShort(s.date)}</p>
                    <p className="text-[10px] text-teal-700 font-bold">{toFa(s.startTime)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{s.classGroup.course.title}</p>
                    <p className="text-[11px] text-muted-foreground">{s.classGroup.name}{s.classGroup.teacher ? ` · ${s.classGroup.teacher.name}` : ''}</p>
                  </div>
                  {s.status === 'LIVE' && (
                    <Button size="sm" variant="destructive" className="h-8" onClick={() => openLive(s.id)}>پیوستن</Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ClipboardCheck className="size-4 text-teal-600" />تکالیف اخیر</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 max-h-80 overflow-y-auto chat-scroll">
              {dash.assignments.length === 0 && <EmptyState title="تکلیفی ندارید" />}
              {dash.assignments.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{a.title}</p>
                    <p className="text-[10px] text-muted-foreground">{a.classGroup.course.title}{a.dueDate ? ` · مهلت: ${faDate(a.dueDate)}` : ''}</p>
                  </div>
                  {a.mySubmission ? (
                    <StatusBadge label={a.mySubmission.score !== null ? `نمره: ${toFa(a.mySubmission.score || 0)}` : 'ارسال شده'} color={a.mySubmission.score !== null ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} />
                  ) : (
                    <Button size="sm" className="h-8" onClick={() => { setSubDialog(a); setSubText('') }}>ارسال</Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ---------- MY COURSES ----------
  if (view === 'courses') {
    return (
      <div className="space-y-4 fade-up">
        <SectionTitle title="دوره‌های من" sub={`${toFa(dash.enrollments.length)} دوره`} />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {dash.enrollments.map((e) => (
            <Card key={e.id} className="border shadow-sm overflow-hidden">
              <div className={`h-20 bg-gradient-to-br ${colorMap[e.classGroup.course.coverColor] || colorMap.emerald} p-4 text-white flex flex-col justify-between`}>
                <div className="flex items-start justify-between">
                  <p className="font-bold text-sm">{e.classGroup.course.title}</p>
                  <StatusBadge label={e.status === 'ACTIVE' ? 'فعال' : 'پایان‌یافته'} color={e.status === 'ACTIVE' ? 'bg-white/25 text-white' : 'bg-white/20 text-white'} />
                </div>
                <p className="text-[10px] opacity-80">{e.classGroup.teacher?.name || '—'}</p>
              </div>
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">{e.classGroup.name}</p>
                <p className="text-[11px] text-teal-700 bg-teal-50 rounded-lg px-2.5 py-1.5 mt-2 inline-block">
                  {e.classGroup.scheduleDays} · {e.classGroup.scheduleTime}
                </p>
                {e.certificate && (
                  <p className="text-[10px] text-violet-700 bg-violet-50 rounded-lg px-2 py-1 mt-2 inline-block mr-1">گواهی: {e.certificate.code}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ---------- SCHEDULE ----------
  if (view === 'schedule') {
    return (
      <div className="space-y-4 fade-up">
        <SectionTitle title="برنامه کلاس‌های من" />
        <Card className="border shadow-sm">
          <CardContent className="p-4 space-y-2.5">
            {dash.enrollments.length === 0 && <EmptyState title="در کلاسی ثبت‌نام نکرده‌اید" />}
            {dash.enrollments.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
                <div className={`size-11 rounded-xl bg-gradient-to-br ${colorMap[e.classGroup.course.coverColor] || colorMap.emerald} text-white flex items-center justify-center shrink-0`}>
                  <CalendarClock className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{e.classGroup.course.title}</p>
                  <p className="text-[11px] text-muted-foreground">{e.classGroup.scheduleDays} · {e.classGroup.scheduleTime} · {e.classGroup.teacher?.name}</p>
                </div>
                <p className="text-xs font-bold text-teal-700">{faDateShort(e.classGroup.sessions?.[0]?.id ? new Date() : new Date())}</p>
              </div>
            ))}
            <div className="mt-4">
              <SectionTitle title="جلسات آینده" />
              <div className="space-y-2.5">
                {dash.upcomingSessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border p-3">
                    <div className="w-14 text-center shrink-0">
                      <p className="text-[10px] text-muted-foreground">{persianWeekday(s.date)}</p>
                      <p className="text-xs font-bold">{faDateShort(s.date)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold">{s.classGroup.course.title}</p>
                      <p className="text-[10px] text-muted-foreground">{toFa(s.startTime)} تا {toFa(s.endTime)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---------- ASSIGNMENTS & QUIZZES ----------
  if (view === 'assignments') {
    return (
      <div className="space-y-5 fade-up">
        <Tabs defaultValue="assignments">
          <TabsList>
            <TabsTrigger value="assignments">تکالیف</TabsTrigger>
            <TabsTrigger value="quizzes">آزمون‌ها</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="mt-4 space-y-2.5 max-h-[65vh] overflow-y-auto chat-scroll">
            {dash.assignments.length === 0 && <EmptyState icon={<ClipboardCheck className="size-6" />} title="تکلیفی ندارید" />}
            {dash.assignments.map((a) => (
              <div key={a.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold flex-1">{a.title}</p>
                  {a.mySubmission ? (
                    <StatusBadge
                      label={a.mySubmission.status === 'GRADED' ? `نمره: ${toFa(a.mySubmission.score || 0)}/${toFa(a.maxScore)}` : 'در انتظار تصحیح'}
                      color={a.mySubmission.status === 'GRADED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}
                    />
                  ) : (
                    <Button size="sm" className="h-8 gap-1" onClick={() => { setSubDialog(a); setSubText('') }}><Send className="size-3.5" />ارسال پاسخ</Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">{a.classGroup.course.title} · {a.classGroup.name}{a.dueDate ? ` · مهلت: ${faDate(a.dueDate)}` : ''}</p>
                {a.description && <p className="text-[11px] text-muted-foreground mt-2 bg-muted/50 rounded-lg p-2.5 leading-5">{a.description}</p>}
                {a.mySubmission?.feedback && (
                  <p className="text-[11px] text-teal-700 bg-teal-50 rounded-lg p-2.5 mt-2 leading-5">بازخورد مدرس: {a.mySubmission.feedback}</p>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="quizzes" className="mt-4 space-y-2.5 max-h-[65vh] overflow-y-auto chat-scroll">
            {dash.quizzes.length === 0 && <EmptyState icon={<ListQuiz className="size-6" />} title="آزمونی فعال نیست" />}
            {dash.quizzes.map((q) => (
              <div key={q.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
                <div className="size-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0"><ListQuiz className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{q.title}</p>
                  <p className="text-[11px] text-muted-foreground">{q.classGroup.course.title} · {toFa(q._count?.questions || 0)} سوال · {toFa(q.durationMin)} دقیقه</p>
                </div>
                {q.myAttempt && q.myAttempt.score !== null ? (
                  <StatusBadge label={`نمره شما: ${toFa(q.myAttempt.score || 0)}٪`} color="bg-emerald-100 text-emerald-700" />
                ) : (
                  <Button size="sm" className="h-8 gap-1" onClick={() => takeQuiz(q.id)}><Clock3 className="size-3.5" />شروع آزمون</Button>
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {/* Submit assignment dialog */}
        <Dialog open={!!subDialog} onOpenChange={(o) => !o && setSubDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>ارسال پاسخ — {subDialog?.title}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>پاسخ شما</Label>
                <Textarea rows={5} placeholder="متن پاسخ یا لینک فایل/گیت‌هاب خود را بنویسید..." value={subText} onChange={(e) => setSubText(e.target.value)} />
              </div>
              <Button
                className="w-full gap-2"
                disabled={saving || !subText.trim()}
                onClick={async () => {
                  setSaving(true)
                  try {
                    await api('/api/submissions', { method: 'POST', body: JSON.stringify({ assignmentId: subDialog!.id, content: subText }) })
                    toast({ title: 'پاسخ ارسال شد ✅' })
                    setSubDialog(null)
                    load()
                  } catch (e) {
                    toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                <Send className="size-4" />ارسال پاسخ
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quiz dialog */}
        <Dialog open={!!quizDetail} onOpenChange={(o) => { if (!o) { setQuizDetail(null); setQuizResult(null) } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{quizDetail?.quiz.title}</DialogTitle></DialogHeader>
            {quizResult !== null ? (
              <div className="text-center py-8">
                <div className="size-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <Award className="size-10" />
                </div>
                <p className="text-2xl font-extrabold">{toFa(quizResult)}٪</p>
                <p className="text-sm text-muted-foreground mt-1">نمره شما در این آزمون</p>
              </div>
            ) : (
              <div className="space-y-4">
                {quizDetail?.quiz.questions.map((q, qi) => (
                  <div key={q.id} className="rounded-xl border p-3.5">
                    <p className="text-xs font-bold">{toFa(qi + 1)}. {q.text}</p>
                    <div className="mt-2.5 space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <button
                          key={oi}
                          onClick={() => setAnswers({ ...answers, [q.id]: oi })}
                          className={`w-full text-right text-xs rounded-lg border px-3 py-2 transition-colors ${answers[q.id] === oi ? 'bg-teal-600 text-white border-teal-600 font-bold' : 'hover:bg-muted'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <Button
                  className="w-full"
                  disabled={Object.keys(answers).length !== quizDetail?.quiz.questions.length}
                  onClick={finishQuiz}
                >
                  پایان و ثبت نمره
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ---------- PAYMENTS ----------
  if (view === 'payments') {
    return (
      <div className="space-y-5 fade-up">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="شهریه کل" value={moneyShort(totalTuition)} icon={<BookOpen className="size-5" />} tone="teal" />
          <StatCard title="پرداخت‌شده" value={moneyShort(totalPaid)} icon={<CreditCard className="size-5" />} tone="emerald" />
          <StatCard title="بدهی باقی‌مانده" value={moneyShort(debt)} icon={<Wallet className="size-5" />} tone={debt > 0 ? 'rose' : 'emerald'} />
          <StatCard title="اقساط باز" value={toFa(dash.installments.length)} icon={<Clock3 className="size-5" />} tone="amber" />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">وضعیت شهریه</CardTitle></CardHeader>
            <CardContent className="h-56" dir="ltr">
              {totalTuition > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={payPie} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={4}>
                      {payPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number | string) => money(Number(v))} contentStyle={{ fontFamily: 'inherit', direction: 'rtl', borderRadius: 12, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'inherit' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="شهریه‌ای ثبت نشده" />
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">اقساط پرداخت‌نشده</CardTitle>
                {dash.installments.length > 0 && (
                  <Button size="sm" onClick={() => { setPayDialog(true); setPayForm({ ...payForm, installmentId: dash.installments[0].id, amount: String(dash.installments[0].amount), enrollmentId: '' }) }} className="h-8 gap-1.5">
                    <CreditCard className="size-3.5" />پرداخت قسط
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 max-h-64 overflow-y-auto chat-scroll">
              {dash.installments.length === 0 && <EmptyState title="قسط پرداخت‌نشده ندارید 🎉" />}
              {dash.installments.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold">{i.enrollment.classGroup.course.title}</p>
                    <p className="text-[10px] text-muted-foreground">سررسید: {faDate(i.dueDate)}</p>
                  </div>
                  <p className="text-sm font-extrabold">{money(i.amount)}</p>
                  <StatusBadge label={INSTALLMENT_STATUS[i.status]?.label || i.status} color={INSTALLMENT_STATUS[i.status]?.color || ''} />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={async () => {
                      try {
                        await api(`/api/installments/${i.id}`, { method: 'PATCH', body: JSON.stringify({ method: 'ONLINE' }) })
                        toast({ title: 'پرداخت انجام شد ✅', description: money(i.amount) })
                        load()
                      } catch (e) {
                        toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
                      }
                    }}
                  >
                    پرداخت آنلاین
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">تاریخچه پرداخت‌ها</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {dash.recentPayments.length === 0 && <EmptyState title="پرداختی ثبت نشده" />}
            {dash.recentPayments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><CreditCard className="size-4.5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">{money(p.amount)}</p>
                  <p className="text-[10px] text-muted-foreground">{faDate(p.paidAt)}{p.refCode ? ` · ${p.refCode}` : ''}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pay dialog */}
        <Dialog open={payDialog} onOpenChange={setPayDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>پرداخت شهریه</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>قسط</Label>
                <Select value={payForm.installmentId} onValueChange={(v) => {
                  const inst = dash.installments.find((i) => i.id === v)
                  setPayForm({ ...payForm, installmentId: v, amount: inst ? String(inst.amount) : payForm.amount })
                }}>
                  <SelectTrigger><SelectValue placeholder="انتخاب قسط" /></SelectTrigger>
                  <SelectContent>
                    {dash.installments.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.enrollment.classGroup.course.title} — {money(i.amount)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>مبلغ (تومان)</Label><Input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label>روش</Label>
                  <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONLINE">پرداخت آنلاین</SelectItem>
                      <SelectItem value="CARD">کارتخوان</SelectItem>
                      <SelectItem value="CASH">نقدی</SelectItem>
                      <SelectItem value="TRANSFER">کارت به کارت</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full gap-2"
                disabled={saving || !payForm.amount}
                onClick={async () => {
                  setSaving(true)
                  try {
                    if (payForm.installmentId) {
                      await api(`/api/installments/${payForm.installmentId}`, { method: 'PATCH', body: JSON.stringify({ method: payForm.method }) })
                    } else {
                      await api('/api/payments', { method: 'POST', body: JSON.stringify({ amount: Number(payForm.amount), method: payForm.method }) })
                    }
                    toast({ title: 'پرداخت با موفقیت انجام شد ✅' })
                    setPayDialog(false)
                    load()
                  } catch (e) {
                    toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                پرداخت {payForm.amount ? money(Number(payForm.amount)) : ''}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ---------- CERTIFICATES ----------
  if (view === 'certificates') {
    return (
      <div className="space-y-4 fade-up">
        <SectionTitle title="گواهینامه‌های من" sub="گواهینامه‌های استعلام‌دار با کد رهگیری" />
        <div className="grid md:grid-cols-2 gap-3">
          {dash.certificates.length === 0 && <div className="col-span-full"><EmptyState icon={<FileBadge className="size-6" />} title="گواهینامه‌ای ندارید" sub="با پایان دوره و کسب نمره قبولی، گواهینامه صادر می‌شود" /></div>}
          {dash.certificates.map((c) => (
            <Card key={c.id} className="border-2 border-teal-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-l from-teal-600 to-emerald-500 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Award className="size-7" />
                  <div>
                    <p className="font-extrabold text-sm">گواهینامه پایان دوره</p>
                    <p className="text-[10px] opacity-80">آکادمی نخبگان</p>
                  </div>
                </div>
                {c.grade !== null && <div className="text-center"><p className="text-lg font-extrabold">{toFa(c.grade || 0)}</p><p className="text-[9px]">از ۱۰۰</p></div>}
              </div>
              <CardContent className="p-4">
                <p className="font-bold text-sm">{c.course?.title}</p>
                <p className="text-[11px] text-muted-foreground mt-1">تاریخ صدور: {faDate(c.issuedAt)}</p>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-[11px] font-mono bg-muted rounded-lg px-2.5 py-1.5">کد استعلام: {c.code}</p>
                  <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => window.print()}>
                    <Download className="size-3.5" />چاپ
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return null

  // ---- helpers ----
  async function takeQuiz(quizId: string) {
    try {
      const d = await api<{ quiz: { id: string; title: string; durationMin: number; questions: { id: string; text: string; options: string[] }[] }; myAttempt?: { score?: number | null } | null }>(`/api/quizzes/${quizId}`)
      if (d.myAttempt && d.myAttempt.score !== null) {
        toast({ title: 'شما قبلاً در این آزمون شرکت کرده‌اید', variant: 'destructive' })
        return
      }
      setAnswers({})
      setQuizResult(null)
      setQuizDetail(d)
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  async function finishQuiz() {
    if (!quizDetail) return
    try {
      const d = await api<{ score: number }>('/api/quiz-attempts', {
        method: 'POST',
        body: JSON.stringify({ quizId: quizDetail.quiz.id, answers }),
      })
      setQuizResult(d.score)
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }
}
