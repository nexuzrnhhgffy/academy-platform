'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { StatCard, StatusBadge, EmptyState, LoadingBlock, SectionTitle } from '@/components/shared/ui-bits'
import { ROLE_LABELS } from '@/lib/constants'
import { toFa, faDate } from '@/lib/fa'
import { useToast } from '@/hooks/use-toast'
import { UserPlus, Search, Users, GraduationCap, Phone, Ban, CheckCircle2, Pencil, Loader2 } from 'lucide-react'

interface U {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  role: string
  isActive: boolean
  branchId?: string | null
  branch?: { name: string } | null
  nationalId?: string | null
  createdAt: string
  teacherProfile?: { specialty: string; hourlyRate: number } | null
  studentProfile?: { studentCode: string } | null
  _count?: { taughtClasses: number; enrollments: number }
}

interface Branch { id: string; name: string }

const ROLE_TABS = [
  { key: 'STUDENT', label: 'دانشجویان', icon: Users },
  { key: 'TEACHER', label: 'اساتید', icon: GraduationCap },
  { key: 'MANAGER', label: 'مدیران', icon: GraduationCap },
  { key: 'STAFF', label: 'پذیرش', icon: Users },
]

export default function UsersView() {
  const { toast } = useToast()
  const [role, setRole] = useState('STUDENT')
  const [users, setUsers] = useState<U[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<U | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', role: 'STUDENT', branchId: '', specialty: '', hourlyRate: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ role })
      if (q) p.set('q', q)
      const d = await api<{ users: U[] }>(`/api/users?${p}`)
      setUsers(d.users)
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [role, q])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api<{ branches: Branch[] }>('/api/branches').then((d) => setBranches(d.branches)).catch(() => {})
  }, [])

  const createUser = async () => {
    setSaving(true)
    try {
      await api('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
          branchId: form.branchId || undefined,
        }),
      })
      toast({ title: 'کاربر ایجاد شد', description: `${form.name} با نقش ${ROLE_LABELS[form.role]}` })
      setCreateOpen(false)
      setForm({ name: '', phone: '', email: '', password: '', role: form.role, branchId: '', specialty: '', hourlyRate: '' })
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (u: U) => {
    try {
      await api(`/api/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !u.isActive }) })
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const saveEdit = async () => {
    if (!editUser) return
    setSaving(true)
    try {
      await api(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editUser.name,
          phone: editUser.phone,
          email: editUser.email,
          branchId: editUser.branchId || undefined,
          hourlyRate: editUser.teacherProfile?.hourlyRate,
        }),
      })
      toast({ title: 'ذخیره شد' })
      setEditUser(null)
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 fade-up">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ROLE_TABS.map((r) => (
          <StatCard
            key={r.key}
            title={r.label}
            value={toFa(r.key === role ? users.length : '—')}
            icon={<r.icon className="size-5" />}
            tone={r.key === 'STUDENT' ? 'teal' : r.key === 'TEACHER' ? 'cyan' : r.key === 'MANAGER' ? 'violet' : 'amber'}
          />
        ))}
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-4 md:p-5">
          <SectionTitle
            title={ROLE_TABS.find((r) => r.key === role)?.label || 'کاربران'}
            sub={`${toFa(users.length)} کاربر`}
            action={
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute right-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input placeholder="جستجو..." className="pr-8 w-40 md:w-56" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-1.5"><UserPlus className="size-4" />افزودن کاربر</Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>ایجاد کاربر جدید</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5 col-span-2">
                        <Label>نام و نام خانوادگی *</Label>
                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>شماره تماس</Label>
                        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>ایمیل</Label>
                        <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>رمز عبور *</Label>
                        <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>نقش *</Label>
                        <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label>شعبه</Label>
                        <Select value={form.branchId || 'none'} onValueChange={(v) => setForm({ ...form, branchId: v === 'none' ? '' : v })}>
                          <SelectTrigger><SelectValue placeholder="انتخاب شعبه" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">بدون شعبه (همه)</SelectItem>
                            {branches.map((b) => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {form.role === 'TEACHER' && (
                        <>
                          <div className="space-y-1.5">
                            <Label>تخصص</Label>
                            <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>حقوق ساعتی (تومان)</Label>
                            <Input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
                          </div>
                        </>
                      )}
                    </div>
                    <Button onClick={createUser} disabled={saving} className="gap-2">
                      {saving && <Loader2 className="size-4 animate-spin" />}
                      ایجاد کاربر
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
            }
          />

          <Tabs value={role} onValueChange={setRole} className="mb-4">
            <TabsList className="w-full flex-wrap h-auto">
              {ROLE_TABS.map((r) => (
                <TabsTrigger key={r.key} value={r.key} className="flex-1 min-w-24">{r.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {loading ? (
            <LoadingBlock rows={5} />
          ) : users.length === 0 ? (
            <EmptyState icon={<Users className="size-6" />} title="کاربری یافت نشد" sub="با دکمه «افزودن کاربر» اولین کاربر را بسازید" />
          ) : (
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto chat-scroll">
              {users.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3.5 hover:bg-muted/40 transition-colors">
                  <div className="size-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                    {u.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold">{u.name}</p>
                      <StatusBadge label={ROLE_LABELS[u.role] || u.role} color="bg-teal-50 text-teal-700" />
                      {!u.isActive && <StatusBadge label="غیرفعال" color="bg-rose-100 text-rose-600" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
                      {u.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{toFa(u.phone)}</span>}
                      {u.studentProfile && <span>کد: {u.studentProfile.studentCode}</span>}
                      {u.teacherProfile && <span>تخصص: {u.teacherProfile.specialty}</span>}
                      {u.branch && <span>{u.branch.name}</span>}
                      <span>عضویت: {faDate(u.createdAt)}</span>
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setEditUser(u)} title="ویرایش">
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleActive(u)} title={u.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}>
                      {u.isActive ? <Ban className="size-4 text-rose-500" /> : <CheckCircle2 className="size-4 text-emerald-600" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ویرایش کاربر</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>نام</Label>
                <Input value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>شماره تماس</Label>
                  <Input value={editUser.phone || ''} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>ایمیل</Label>
                  <Input value={editUser.email || ''} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>شعبه</Label>
                <Select value={editUser.branchId || 'none'} onValueChange={(v) => setEditUser({ ...editUser, branchId: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون شعبه</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editUser.teacherProfile && (
                <>
                  <div className="space-y-1.5">
                    <Label>تخصص</Label>
                    <Input
                      value={editUser.teacherProfile.specialty}
                      onChange={(e) => setEditUser({ ...editUser, teacherProfile: { ...editUser.teacherProfile!, specialty: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>حقوق ساعتی (تومان)</Label>
                    <Input
                      type="number"
                      value={editUser.teacherProfile.hourlyRate}
                      onChange={(e) => setEditUser({ ...editUser, teacherProfile: { ...editUser.teacherProfile!, hourlyRate: Number(e.target.value) } })}
                    />
                  </div>
                </>
              )}
              <Button onClick={saveEdit} disabled={saving} className="w-full gap-2">
                {saving && <Loader2 className="size-4 animate-spin" />}
                ذخیره تغییرات
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
