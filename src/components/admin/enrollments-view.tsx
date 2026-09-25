'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/store/app-store'
import { useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatCard, StatusBadge, EmptyState, LoadingBlock, SectionTitle } from '@/components/shared/ui-bits'
import { ENROLL_STATUS } from '@/lib/constants'
import { toFa, money, moneyShort, faDate } from '@/lib/fa'
import { useToast } from '@/hooks/use-toast'
import { ListChecks, UserPlus, Loader2, Award, GraduationCap, CheckCircle2 } from 'lucide-react'

interface Enr {
  id: string; status: string; discount: number; createdAt: string; finalGrade?: number | null
  student: { id: string; name: string; phone?: string | null; studentProfile?: { studentCode: string } | null }
  classGroup: { id: string; name: string; capacity: number; course: { id: string; title: string; price: number }; teacher?: { name: string } | null }
  payments: { amount: number; status: string }[]
  installments: { amount: number; status: string }[]
  certificate?: { code: string } | null
}
interface UserLite { id: string; name: string; role: string }
interface ClsLite { id: string; name: string; capacity: number; status: string; course: { title: string; price: number }; _count?: { enrollments: number } }

export default function EnrollmentsView() {
  const { user } = useApp()
  const { toast } = useToast()
  const [enrollments, setEnrollments] = useState<Enr[]>([])
  const [students, setStudents] = useState<UserLite[]>([])
  const [classes, setClasses] = useState<ClsLite[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ studentId: '', classGroupId: '', discount: '0', installments: '1' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [e, s, c] = await Promise.all([
        api<{ enrollments: Enr[] }>('/api/enrollments'),
        api<{ users: UserLite[] }>('/api/users?role=STUDENT'),
        api<{ classes: ClsLite[] }>('/api/classes'),
      ])
      setEnrollments(e.enrollments)
      setStudents(s.users)
      setClasses(c.classes)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    setSaving(true)
    try {
      await api('/api/enrollments', {
        method: 'POST',
        body: JSON.stringify({ studentId: form.studentId, classGroupId: form.classGroupId, discount: Number(form.discount), installments: Number(form.installments) }),
      })
      toast({ title: 'ثبت‌نام انجام شد 🎉', description: 'اقساط به‌صورت خودکار ایجاد شد' })
      setOpen(false)
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const complete = async (e: Enr) => {
    const grade = prompt(`نمره نهایی ${e.student.name} (از ۱۰۰):`, '85')
    if (grade === null) return
    try {
      await api(`/api/enrollments/${e.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED', finalGrade: Number(grade) }) })
      toast({ title: 'دوره تکمیل شد', description: Number(grade) >= 50 ? 'گواهینامه به‌صورت خودکار صادر شد' : 'نمره کافی برای گواهینامه نبود' })
      load()
    } catch (err) {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : '', variant: 'destructive' })
    }
  }

  const selectedCourse = classes.find((c) => c.id === form.classGroupId)

  return (
    <div className="space-y-5 fade-up">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="کل ثبت‌نام‌ها" value={toFa(enrollments.length)} icon={<ListChecks className="size-5" />} tone="teal" />
        <StatCard title="فعال" value={toFa(enrollments.filter((e) => e.status === 'ACTIVE').length)} icon={<GraduationCap className="size-5" />} tone="emerald" />
        <StatCard title="پایان‌یافته" value={toFa(enrollments.filter((e) => e.status === 'COMPLETED').length)} icon={<Award className="size-5" />} tone="violet" />
        <StatCard title="شهریه کل" value={moneyShort(enrollments.reduce((s, e) => s + e.classGroup.course.price - e.discount, 0))} icon={<CheckCircle2 className="size-5" />} tone="cyan" />
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-5">
          <SectionTitle
            title="ثبت‌نام‌های کلاس‌ها"
            action={
              ['ADMIN', 'MANAGER', 'STAFF'].includes(user?.role || '') && (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild><Button className="gap-1.5"><UserPlus className="size-4" />ثبت‌نام جدید</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>ثبت‌نام دانشجو در کلاس</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label>دانشجو *</Label>
                        <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
                          <SelectTrigger><SelectValue placeholder="انتخاب دانشجو" /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>کلاس *</Label>
                        <Select value={form.classGroupId} onValueChange={(v) => setForm({ ...form, classGroupId: v })}>
                          <SelectTrigger><SelectValue placeholder="انتخاب کلاس" /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            {classes.map((c) => (
                              <SelectItem key={c.id} value={c.id} disabled={c._count && c._count.enrollments >= c.capacity}>
                                {c.name} — {c.course.title} ({toFa(c._count?.enrollments || 0)}/{toFa(c.capacity)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label>تخفیف (تومان)</Label><Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>تعداد اقساط</Label><Input type="number" min="1" max="12" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} /></div>
                      </div>
                      {selectedCourse && (
                        <div className="rounded-xl bg-teal-50 p-3 text-xs">
                          <p>شهریه دوره: <b>{money(selectedCourse.course.price)}</b></p>
                          <p className="mt-1">مبلغ پس از تخفیف: <b>{money(Math.max(selectedCourse.course.price - Number(form.discount || 0), 0))}</b></p>
                          {Number(form.installments) > 1 && (
                            <p className="mt-1 text-teal-700">
                              هر قسط: <b>{money(Math.floor(Math.max(selectedCourse.course.price - Number(form.discount || 0), 0) / Number(form.installments)))}</b>
                            </p>
                          )}
                        </div>
                      )}
                      <Button onClick={create} disabled={saving || !form.studentId || !form.classGroupId} className="w-full gap-2">
                        {saving && <Loader2 className="size-4 animate-spin" />}
                        ثبت‌نام
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )
            }
          />

          {loading ? (
            <LoadingBlock rows={6} />
          ) : enrollments.length === 0 ? (
            <EmptyState icon={<ListChecks className="size-6" />} title="ثبت‌نامی وجود ندارد" />
          ) : (
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto chat-scroll">
              {enrollments.map((e) => {
                const paid = e.payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0)
                const tuition = Math.max(e.classGroup.course.price - e.discount, 0)
                const debt = Math.max(tuition - paid, 0)
                return (
                  <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3.5 hover:bg-muted/30 transition-colors">
                    <div className="size-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                      {e.student.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold">{e.student.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {e.classGroup.course.title} · {e.classGroup.name} · {faDate(e.createdAt)}
                      </p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-xs font-bold">{money(paid)} <span className="text-[10px] font-normal text-muted-foreground">از {moneyShort(tuition)}</span></p>
                      {debt > 0 && <p className="text-[10px] text-rose-600 font-bold">بدهی: {moneyShort(debt)}</p>}
                    </div>
                    {e.certificate && <StatusBadge label={`گواهی ${e.certificate.code}`} color="bg-violet-50 text-violet-700" />}
                    <StatusBadge
                      label={ENROLL_STATUS[e.status]?.label || e.status}
                      color={ENROLL_STATUS[e.status]?.color || ''}
                    />
                    {e.status === 'ACTIVE' && ['ADMIN', 'MANAGER', 'STAFF'].includes(user?.role || '') && (
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => complete(e)}>
                        <Award className="size-3.5" />تکمیل دوره
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
