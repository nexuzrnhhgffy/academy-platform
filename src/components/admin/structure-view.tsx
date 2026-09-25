'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/store/app-store'
import { useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, LoadingBlock, SectionTitle, StatCard } from '@/components/shared/ui-bits'
import { toFa, money } from '@/lib/fa'
import { useToast } from '@/hooks/use-toast'
import { Building2, Plus, Trash2, BookOpen, DoorOpen, Loader2, MapPin, Phone, Layers, Clock, DoorClosed } from 'lucide-react'

interface Branch { id: string; name: string; code: string; address?: string | null; phone?: string | null; isActive: boolean; manager?: { name: string } | null; _count?: { users: number; classes: number; rooms: number; courses: number } }
interface Room { id: string; name: string; capacity: number; branchId: string; branch?: { name: string }; _count?: { classes: number } }
interface Course { id: string; title: string; description?: string | null; category: string; level: string; price: number; sessionsCount: number; durationHours: number; coverColor: string; isActive: boolean; branch?: { name: string } | null; _count?: { classes: number } }

const colorMap: Record<string, string> = {
  emerald: 'from-emerald-500 to-teal-600', cyan: 'from-cyan-500 to-sky-600', violet: 'from-violet-500 to-purple-600',
  amber: 'from-amber-500 to-orange-600', rose: 'from-rose-500 to-pink-600', teal: 'from-teal-500 to-emerald-600',
}

const EMPTY_COURSE = { title: '', description: '', category: 'برنامه‌نویسی', level: 'مقدماتی', price: '', sessionsCount: '8', durationHours: '', coverColor: 'emerald' }

export default function StructureView() {
  const { user } = useApp()
  const { toast } = useToast()
  const isAdmin = user?.role === 'ADMIN'
  const [branches, setBranches] = useState<Branch[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [bForm, setBForm] = useState({ name: '', code: '', address: '', phone: '' })
  const [rForm, setRForm] = useState({ name: '', capacity: '20', branchId: '' })
  const [cForm, setCForm] = useState(EMPTY_COURSE)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState<'branch' | 'room' | 'course' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [b, r, c] = await Promise.all([
        api<{ branches: Branch[] }>('/api/branches'),
        api<{ rooms: Room[] }>('/api/rooms'),
        api<{ courses: Course[] }>('/api/courses'),
      ])
      setBranches(b.branches)
      setRooms(r.rooms)
      setCourses(c.courses)
      if (!rForm.branchId && b.branches[0]) setRForm((f) => ({ ...f, branchId: b.branches[0].id }))
    } finally {
      setLoading(false)
    }
     
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    try {
      if (dialogOpen === 'branch') {
        await api('/api/branches', { method: 'POST', body: JSON.stringify(bForm) })
        toast({ title: 'شعبه ایجاد شد' })
      } else if (dialogOpen === 'room') {
        await api('/api/rooms', { method: 'POST', body: JSON.stringify(rForm) })
        toast({ title: 'سالن/کلاس ایجاد شد' })
      } else if (dialogOpen === 'course') {
        await api('/api/courses', {
          method: 'POST',
          body: JSON.stringify({ ...cForm, price: Number(cForm.price), sessionsCount: Number(cForm.sessionsCount), durationHours: Number(cForm.durationHours) }),
        })
        toast({ title: 'دوره ایجاد شد' })
      }
      setDialogOpen(null)
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const deleteItem = async (type: 'branch' | 'room' | 'course', id: string) => {
    try {
      if (type === 'branch') await api(`/api/branches/${id}`, { method: 'DELETE' })
      if (type === 'room') await api(`/api/rooms?id=${id}`, { method: 'DELETE' })
      if (type === 'course') await api(`/api/courses/${id}`, { method: 'DELETE' })
      toast({ title: 'حذف شد' })
      load()
    } catch (e) {
      toast({ title: 'خطا در حذف', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  if (loading) return <LoadingBlock rows={6} />

  return (
    <div className="space-y-5 fade-up">
      <div className="grid grid-cols-3 gap-3">
        <StatCard title="شعب" value={toFa(branches.length)} icon={<Building2 className="size-5" />} tone="teal" />
        <StatCard title="سالن‌ها/کلاس‌ها" value={toFa(rooms.length)} icon={<DoorOpen className="size-5" />} tone="cyan" />
        <StatCard title="دوره‌ها" value={toFa(courses.length)} icon={<BookOpen className="size-5" />} tone="violet" />
      </div>

      <Tabs defaultValue="courses">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            {isAdmin && <TabsTrigger value="branches">شعب</TabsTrigger>}
            <TabsTrigger value="rooms">سالن‌ها</TabsTrigger>
            <TabsTrigger value="courses">دوره‌ها</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => setDialogOpen('branch')} className="gap-1.5"><Plus className="size-4" />شعبه جدید</Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setDialogOpen('room')} className="gap-1.5"><Plus className="size-4" />سالن جدید</Button>
            <Button size="sm" onClick={() => setDialogOpen('course')} className="gap-1.5"><Plus className="size-4" />دوره جدید</Button>
          </div>
        </div>

        {/* Branches */}
        {isAdmin && (
          <TabsContent value="branches" className="mt-4">
            <div className="grid md:grid-cols-2 gap-3">
              {branches.length === 0 && <EmptyState title="شعبه‌ای وجود ندارد" />}
              {branches.map((b) => (
                <Card key={b.id} className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="size-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                          <Building2 className="size-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{b.name}</p>
                          <p className="text-[11px] text-muted-foreground">کد: {b.code}{b.manager ? ` · مدیر: ${b.manager.name}` : ''}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteItem('branch', b.id)}><Trash2 className="size-4 text-rose-500" /></Button>
                    </div>
                    <div className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
                      {b.address && <p className="flex items-center gap-1.5"><MapPin className="size-3" />{b.address}</p>}
                      {b.phone && <p className="flex items-center gap-1.5"><Phone className="size-3" />{b.phone}</p>}
                    </div>
                    <div className="flex gap-4 mt-3 text-center">
                      {[
                        { n: b._count?.users || 0, l: 'کاربر' },
                        { n: b._count?.classes || 0, l: 'کلاس' },
                        { n: b._count?.rooms || 0, l: 'سالن' },
                      ].map((s) => (
                        <div key={s.l} className="flex-1 rounded-lg bg-muted/60 py-1.5">
                          <p className="text-sm font-extrabold">{toFa(s.n)}</p>
                          <p className="text-[10px] text-muted-foreground">{s.l}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {/* Rooms */}
        <TabsContent value="rooms" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {rooms.length === 0 && <div className="col-span-full"><EmptyState title="سالنی ثبت نشده" /></div>}
            {rooms.map((r) => (
              <Card key={r.id} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="size-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                      <DoorClosed className="size-4.5" />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem('room', r.id)}><Trash2 className="size-3.5 text-rose-500" /></Button>
                  </div>
                  <p className="font-bold text-sm mt-2.5">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">ظرفیت: {toFa(r.capacity)} نفر · {r.branch?.name}</p>
                  <p className="text-[11px] text-muted-foreground">{toFa(r._count?.classes || 0)} کلاس فعال</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Courses */}
        <TabsContent value="courses" className="mt-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {courses.length === 0 && <div className="col-span-full"><EmptyState title="دوره‌ای ثبت نشده" /></div>}
            {courses.map((c) => (
              <Card key={c.id} className="border shadow-sm overflow-hidden">
                <div className={`h-16 bg-gradient-to-br ${colorMap[c.coverColor] || colorMap.emerald} flex items-center justify-between px-4 text-white`}>
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-5" />
                    <p className="font-bold text-sm">{c.title}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => deleteItem('course', c.id)} className="opacity-70 hover:opacity-100"><Trash2 className="size-4" /></button>
                  )}
                </div>
                <CardContent className="p-4">
                  {c.description && <p className="text-[11px] text-muted-foreground leading-5 line-clamp-2 min-h-10">{c.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[10px] bg-muted rounded-full px-2 py-0.5">{c.category}</span>
                    <span className="text-[10px] bg-muted rounded-full px-2 py-0.5">{c.level}</span>
                    <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 flex items-center gap-1"><Clock className="size-3" />{toFa(c.durationHours)} ساعت</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm font-extrabold text-teal-700">{money(c.price)}</p>
                    <p className="text-[11px] text-muted-foreground">{toFa(c.sessionsCount)} جلسه · {toFa(c._count?.classes || 0)} کلاس</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create dialogs */}
      <Dialog open={dialogOpen !== null} onOpenChange={(o) => !o && setDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogOpen === 'branch' ? 'ایجاد شعبه جدید' : dialogOpen === 'room' ? 'ایجاد سالن/کلاس جدید' : 'ایجاد دوره جدید'}
            </DialogTitle>
          </DialogHeader>

          {dialogOpen === 'branch' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>نام شعبه *</Label><Input placeholder="شعبه غرب — پونک" value={bForm.name} onChange={(e) => setBForm({ ...bForm, name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>کد شعبه *</Label><Input placeholder="BR-PONAK" value={bForm.code} onChange={(e) => setBForm({ ...bForm, code: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>آدرس</Label><Input value={bForm.address} onChange={(e) => setBForm({ ...bForm, address: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>تلفن</Label><Input value={bForm.phone} onChange={(e) => setBForm({ ...bForm, phone: e.target.value })} /></div>
            </div>
          )}

          {dialogOpen === 'room' && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>نام سالن *</Label><Input placeholder="کلاس ۳۰۱" value={rForm.name} onChange={(e) => setRForm({ ...rForm, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>ظرفیت</Label><Input type="number" value={rForm.capacity} onChange={(e) => setRForm({ ...rForm, capacity: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label>شعبه *</Label>
                  <Select value={rForm.branchId} onValueChange={(v) => setRForm({ ...rForm, branchId: v })}>
                    <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {dialogOpen === 'course' && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pl-1">
              <div className="space-y-1.5"><Label>عنوان دوره *</Label><Input placeholder="برنامه‌نویسی جاوااسکریپت" value={cForm.title} onChange={(e) => setCForm({ ...cForm, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>توضیحات</Label><Textarea rows={2} value={cForm.description} onChange={(e) => setCForm({ ...cForm, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>دسته‌بندی</Label>
                  <Select value={cForm.category} onValueChange={(v) => setCForm({ ...cForm, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['برنامه‌نویسی', 'زبان‌های خارجی', 'هنر و طراحی', 'مدیریت و کسب‌وکار', 'کنکور', 'مهارت‌های نرم'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>سطح</Label>
                  <Select value={cForm.level} onValueChange={(v) => setCForm({ ...cForm, level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['مقدماتی', 'متوسط', 'پیشرفته'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>شهریه (تومان)</Label><Input type="number" value={cForm.price} onChange={(e) => setCForm({ ...cForm, price: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>تعداد جلسات</Label><Input type="number" value={cForm.sessionsCount} onChange={(e) => setCForm({ ...cForm, sessionsCount: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>مدت (ساعت)</Label><Input type="number" value={cForm.durationHours} onChange={(e) => setCForm({ ...cForm, durationHours: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label>رنگ</Label>
                  <Select value={cForm.coverColor} onValueChange={(v) => setCForm({ ...cForm, coverColor: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(colorMap).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <Button onClick={save} disabled={saving} className="gap-2">
            {saving && <Loader2 className="size-4 animate-spin" />}
            ذخیره
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
