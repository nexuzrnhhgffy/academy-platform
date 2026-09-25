'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/store/app-store'
import { useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatCard, StatusBadge, EmptyState, LoadingBlock, SectionTitle } from '@/components/shared/ui-bits'
import { PAY_METHODS, PAY_STATUS, EXPENSE_CATEGORIES, INSTALLMENT_STATUS } from '@/lib/constants'
import { money, moneyShort, toFa, faDate, faMonth } from '@/lib/fa'
import { useToast } from '@/hooks/use-toast'
import {
  Wallet, Receipt, PiggyBank, TrendingUp, Plus, Trash2, Loader2, AlertTriangle,
  Download, Landmark, HandCoins, Banknote, CreditCard, Users,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

interface Payment { id: string; amount: number; method: string; status: string; refCode?: string | null; note?: string | null; paidAt: string; student: { name: string }; enrollment?: { classGroup: { name: string; course: { title: string } } } | null; branch?: { name: string } | null }
interface Expense { id: string; title: string; category: string; amount: number; date: string; note?: string | null; branch?: { name: string } | null; createdBy?: { name: string } | null }
interface Payroll { id: string; month: string; baseAmount: number; hoursCount: number; hourlyRate: number; bonus: number; deduction: number; total: number; status: string; paidAt?: string | null; teacher: { id: string; name: string; teacherProfile?: { hourlyRate: number } | null } }
interface Installment { id: string; amount: number; dueDate: string; status: string; enrollment: { id: string; student: { name: string }; classGroup: { name: string } } }
interface Summary {
  totals: { income: number; expense: number; profit: number; debt: number; paymentsCount: number; enrollmentsCount: number }
  series: { month: string; income: number; expense: number }[]
  byCourse: Record<string, number>
  byMethod: Record<string, number>
  debtors: { studentId: string; studentName: string; className: string; courseTitle: string; tuition: number; paid: number; debt: number; overdue: number }[]
}
interface UserLite { id: string; name: string }
interface EnrLite { id: string; student: { name: string }; classGroup: { name: string; course: { title: string } } }

const MONTHS_FA: Record<string, string> = { '01': 'فروردین', '02': 'اردیبهشت', '03': 'خرداد', '04': 'تیر', '05': 'مرداد', '06': 'شهریور', '07': 'مهر', '08': 'آبان', '09': 'آذر', '10': 'دی', '11': 'بهمن', '12': 'اسفند' }
const PIE_COLORS = ['#0d9488', '#14b8a6', '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444', '#a855f7', '#06b6d4']

export default function FinanceView() {
  const { user } = useApp()
  const { toast } = useToast()
  const isAdmin = ['ADMIN', 'MANAGER'].includes(user?.role || '')
  const [tab, setTab] = useState('summary')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [installments, setInstallments] = useState<Installment[]>([])
  const [teachers, setTeachers] = useState<UserLite[]>([])
  const [enrollments, setEnrollments] = useState<EnrLite[]>([])
  const [loading, setLoading] = useState(true)
  const [payDialog, setPayDialog] = useState(false)
  const [expDialog, setExpDialog] = useState(false)
  const [payrollDialog, setPayrollDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [payForm, setPayForm] = useState({ enrollmentId: '', amount: '', method: 'CASH', note: '' })
  const [expForm, setExpForm] = useState({ title: '', category: 'RENT', amount: '', note: '' })
  const [payrollForm, setPayrollForm] = useState({ teacherId: '', month: new Date().toISOString().slice(0, 7), bonus: '0', deduction: '0' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, p, e, pr, i] = await Promise.all([
        isAdmin ? api<Summary>('/api/finance/summary') : Promise.resolve(null),
        api<{ payments: Payment[] }>('/api/payments'),
        api<{ expenses: Expense[] }>('/api/expenses'),
        api<{ payrolls: Payroll[] }>('/api/payroll'),
        api<{ installments: Installment[] }>('/api/installments'),
      ])
      if (s) setSummary(s)
      setPayments(p.payments)
      setExpenses(e.expenses)
      setPayrolls(pr.payrolls)
      setInstallments(i.installments)
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api<{ users: UserLite[] }>('/api/users?role=TEACHER').then((d) => setTeachers(d.users)).catch(() => {})
    api<{ enrollments: EnrLite[] }>('/api/enrollments').then((d) => setEnrollments(d.enrollments)).catch(() => {})
  }, [])

  const addPayment = async () => {
    setSaving(true)
    try {
      await api('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ enrollmentId: payForm.enrollmentId || undefined, amount: Number(payForm.amount), method: payForm.method, note: payForm.note }),
      })
      toast({ title: 'پرداخت ثبت شد', description: money(Number(payForm.amount)) })
      setPayDialog(false)
      setPayForm({ enrollmentId: '', amount: '', method: 'CASH', note: '' })
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const addExpense = async () => {
    setSaving(true)
    try {
      await api('/api/expenses', { method: 'POST', body: JSON.stringify({ ...expForm, amount: Number(expForm.amount) }) })
      toast({ title: 'هزینه ثبت شد' })
      setExpDialog(false)
      setExpForm({ title: '', category: 'RENT', amount: '', note: '' })
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const issuePayroll = async () => {
    setSaving(true)
    try {
      await api('/api/payroll', {
        method: 'POST',
        body: JSON.stringify({ teacherId: payrollForm.teacherId, month: payrollForm.month, bonus: Number(payrollForm.bonus), deduction: Number(payrollForm.deduction) }),
      })
      toast({ title: 'فیش حقوقی صادر شد' })
      setPayrollDialog(false)
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const payPayroll = async (id: string) => {
    try {
      await api(`/api/payroll/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'PAID' }) })
      toast({ title: 'حقوق پرداخت شد' })
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const payInstallment = async (id: string) => {
    try {
      await api(`/api/installments/${id}`, { method: 'PATCH', body: JSON.stringify({}) })
      toast({ title: 'قسط پرداخت شد' })
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  if (loading) return <LoadingBlock rows={8} />

  const chartData = summary ? summary.series.map((s) => ({ name: MONTHS_FA[s.month.split('-')[1]] || s.month, درآمد: s.income, هزینه: s.expense })) : []
  const pieData = summary ? Object.entries(summary.byCourse).map(([name, value]) => ({ name, value })) : []

  return (
    <div className="space-y-5 fade-up">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="flex-wrap h-auto">
            {isAdmin && <TabsTrigger value="summary">گزارش مالی</TabsTrigger>}
            <TabsTrigger value="payments">پرداخت‌ها</TabsTrigger>
            <TabsTrigger value="installments">اقساط</TabsTrigger>
            <TabsTrigger value="expenses">هزینه‌ها</TabsTrigger>
            <TabsTrigger value="payroll">حقوق اساتید</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setPayDialog(true)} className="gap-1.5"><Plus className="size-4" />ثبت پرداخت</Button>
            {isAdmin && (
              <>
                <Button size="sm" variant="outline" onClick={() => setExpDialog(true)} className="gap-1.5"><Plus className="size-4" />هزینه</Button>
                <Button size="sm" variant="outline" onClick={() => setPayrollDialog(true)} className="gap-1.5"><PiggyBank className="size-4" />فیش حقوقی</Button>
              </>
            )}
          </div>
        </div>

        {/* Summary report */}
        {isAdmin && (
          <TabsContent value="summary" className="mt-4 space-y-4">
            {summary && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard title="درآمد کل" value={moneyShort(summary.totals.income)} sub={`${toFa(summary.totals.paymentsCount)} پرداخت`} icon={<Wallet className="size-5" />} tone="emerald" />
                  <StatCard title="هزینه کل" value={moneyShort(summary.totals.expense)} icon={<Receipt className="size-5" />} tone="rose" />
                  <StatCard title="سود خالص" value={moneyShort(summary.totals.profit)} icon={<TrendingUp className="size-5" />} tone="teal" />
                  <StatCard title="مطالبات" value={moneyShort(summary.totals.debt)} sub={`${toFa(summary.debtors.length)} بدهکار`} icon={<AlertTriangle className="size-5" />} tone="amber" />
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Landmark className="size-4 text-teal-600" />درآمد و هزینه ۱۲ ماه</CardTitle></CardHeader>
                    <CardContent className="h-64" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => moneyShort(Number(v))} width={55} />
                          <Tooltip formatter={(v: number | string) => money(Number(v))} contentStyle={{ fontFamily: 'inherit', direction: 'rtl', borderRadius: 12, fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'inherit' }} />
                          <Bar dataKey="درآمد" fill="#0d9488" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="هزینه" fill="#f87171" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="border shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Banknote className="size-4 text-teal-600" />سهم درآمد دوره‌ها</CardTitle></CardHeader>
                    <CardContent className="h-64" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number | string) => money(Number(v))} contentStyle={{ fontFamily: 'inherit', direction: 'rtl', borderRadius: 12, fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'inherit' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="size-4 text-amber-600" />لیست بدهکاران</CardTitle></CardHeader>
                  <CardContent className="space-y-2 max-h-72 overflow-y-auto chat-scroll">
                    {summary.debtors.length === 0 && <EmptyState title="بدهی وجود ندارد 🎉" />}
                    {summary.debtors.map((d) => (
                      <div key={`${d.studentId}-${d.className}`} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold">{d.studentName}</p>
                          <p className="text-[10px] text-muted-foreground">{d.courseTitle} · {d.className}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-extrabold text-rose-600">{money(d.debt)}</p>
                          <p className="text-[10px] text-muted-foreground">پرداخته: {moneyShort(d.paid)} از {moneyShort(d.tuition)}</p>
                        </div>
                        {d.overdue > 0 && <StatusBadge label={`معوق ${moneyShort(d.overdue)}`} color="bg-rose-100 text-rose-700" />}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}

        {/* Payments */}
        <TabsContent value="payments" className="mt-4">
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <SectionTitle title="پرداخت‌های شهریه" sub={`${toFa(payments.length)} پرداخت ثبت‌شده`} />
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto chat-scroll">
                {payments.length === 0 && <EmptyState title="پرداختی ثبت نشده" />}
                {payments.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                    <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${p.method === 'ONLINE' ? 'bg-cyan-50 text-cyan-600' : p.method === 'CARD' ? 'bg-teal-50 text-teal-600' : p.method === 'TRANSFER' ? 'bg-violet-50 text-violet-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {p.method === 'ONLINE' ? <CreditCard className="size-5" /> : <Banknote className="size-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold">{p.student?.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.enrollment ? `${p.enrollment.classGroup.course.title} · ${p.enrollment.classGroup.name}` : 'شهریه عمومی'}
                        {' · '}{PAY_METHODS[p.method]} · {faDate(p.paidAt)}
                      </p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-sm font-extrabold text-emerald-700">{money(p.amount)}</p>
                      {p.refCode && <p className="text-[9px] text-muted-foreground font-mono">{p.refCode}</p>}
                    </div>
                    <StatusBadge label={PAY_STATUS[p.status]?.label || p.status} color={PAY_STATUS[p.status]?.color || ''} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Installments */}
        <TabsContent value="installments" className="mt-4">
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <SectionTitle title="مدیریت اقساط" sub={`${toFa(installments.filter((i) => i.status !== 'PAID').length)} قسط پرداخت‌نشده`} />
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto chat-scroll">
                {installments.length === 0 && <EmptyState title="قسطی تعریف نشده" />}
                {installments.map((i) => (
                  <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                    <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${i.status === 'OVERDUE' ? 'bg-rose-50 text-rose-600' : i.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      <AlertTriangle className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold">{i.enrollment.student.name}</p>
                      <p className="text-[10px] text-muted-foreground">{i.enrollment.classGroup.name} · سررسید: {faDate(i.dueDate)}</p>
                    </div>
                    <p className="text-sm font-extrabold">{money(i.amount)}</p>
                    <StatusBadge label={INSTALLMENT_STATUS[i.status]?.label || i.status} color={INSTALLMENT_STATUS[i.status]?.color || ''} />
                    {i.status !== 'PAID' && (
                      <Button size="sm" variant="outline" className="h-8" onClick={() => payInstallment(i.id)}>دریافت</Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses */}
        <TabsContent value="expenses" className="mt-4">
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <SectionTitle title="هزینه‌های موسسه" sub={`جمع: ${money(expenses.reduce((s, e) => s + e.amount, 0))}`} />
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto chat-scroll">
                {expenses.length === 0 && <EmptyState title="هزینه‌ای ثبت نشده" />}
                {expenses.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                    <div className="size-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <Receipt className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold">{e.title}</p>
                      <p className="text-[10px] text-muted-foreground">{EXPENSE_CATEGORIES[e.category] || e.category} · {faDate(e.date)}{e.branch ? ` · ${e.branch.name}` : ''}</p>
                    </div>
                    <p className="text-sm font-extrabold text-rose-600">{money(e.amount)}</p>
                    {['ADMIN', 'MANAGER'].includes(user?.role || '') && (
                      <Button variant="ghost" size="icon" onClick={async () => { await api(`/api/expenses?id=${e.id}`, { method: 'DELETE' }); load() }}>
                        <Trash2 className="size-3.5 text-rose-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll */}
        <TabsContent value="payroll" className="mt-4">
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <SectionTitle title="فیش‌های حقوقی اساتید" sub="محاسبه خودکار بر اساس جلسات برگزارشده و نرخ ساعتی" />
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto chat-scroll">
                {payrolls.length === 0 && <EmptyState title="فیشی صادر نشده" />}
                {payrolls.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3.5">
                    <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${p.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      <HandCoins className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold">{p.teacher.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {faMonth(`${p.month}-01`)} · {toFa(Math.round(p.hoursCount))} ساعت × {moneyShort(p.hourlyRate)}
                        {p.bonus ? ` · پاداش ${moneyShort(p.bonus)}` : ''}{p.deduction ? ` · کسور ${moneyShort(p.deduction)}` : ''}
                      </p>
                    </div>
                    <p className="text-sm font-extrabold">{money(p.total)}</p>
                    <StatusBadge label={p.status === 'PAID' ? 'پرداخت‌شده' : 'در انتظار پرداخت'} color={p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} />
                    {p.status !== 'PAID' && ['ADMIN', 'MANAGER'].includes(user?.role || '') && (
                      <Button size="sm" className="h-8" onClick={() => payPayroll(p.id)}>پرداخت</Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>ثبت پرداخت شهریه</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>ثبت‌نام / کلاس</Label>
              <Select value={payForm.enrollmentId} onValueChange={(v) => setPayForm({ ...payForm, enrollmentId: v })}>
                <SelectTrigger><SelectValue placeholder="انتخاب ثبت‌نام" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {enrollments.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.student.name} — {e.classGroup.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>مبلغ (تومان) *</Label><Input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>روش پرداخت</Label>
                <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PAY_METHODS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>توضیحات</Label><Input value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} /></div>
            <Button onClick={addPayment} disabled={saving || !payForm.amount} className="w-full gap-2">{saving && <Loader2 className="size-4 animate-spin" />}ثبت پرداخت</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense dialog */}
      <Dialog open={expDialog} onOpenChange={setExpDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>ثبت هزینه</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>عنوان *</Label><Input placeholder="اجاره ساختمان" value={expForm.title} onChange={(e) => setExpForm({ ...expForm, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>دسته‌بندی</Label>
                <Select value={expForm.category} onValueChange={(v) => setExpForm({ ...expForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>مبلغ (تومان) *</Label><Input type="number" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>توضیحات</Label><Input value={expForm.note} onChange={(e) => setExpForm({ ...expForm, note: e.target.value })} /></div>
            <Button onClick={addExpense} disabled={saving || !expForm.title || !expForm.amount} className="w-full gap-2">{saving && <Loader2 className="size-4 animate-spin" />}ثبت هزینه</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payroll dialog */}
      <Dialog open={payrollDialog} onOpenChange={setPayrollDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>صدور فیش حقوقی</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>مدرس *</Label>
              <Select value={payrollForm.teacherId} onValueChange={(v) => setPayrollForm({ ...payrollForm, teacherId: v })}>
                <SelectTrigger><SelectValue placeholder="انتخاب مدرس" /></SelectTrigger>
                <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>ماه *</Label><Input type="month" value={payrollForm.month} onChange={(e) => setPayrollForm({ ...payrollForm, month: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>پاداش</Label><Input type="number" value={payrollForm.bonus} onChange={(e) => setPayrollForm({ ...payrollForm, bonus: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>کسورات</Label><Input type="number" value={payrollForm.deduction} onChange={(e) => setPayrollForm({ ...payrollForm, deduction: e.target.value })} /></div>
            </div>
            <p className="text-[11px] text-muted-foreground">ساعات تدریس، نرخ ساعتی و جمع فیش به‌صورت خودکار از جلسات برگزارشده محاسبه می‌شود.</p>
            <Button onClick={issuePayroll} disabled={saving || !payrollForm.teacherId} className="w-full gap-2">{saving && <Loader2 className="size-4 animate-spin" />}صدور فیش</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
