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
import { Badge } from '@/components/ui/badge'
import { EmptyState, LoadingBlock, SectionTitle, StatusBadge } from '@/components/shared/ui-bits'
import { AUDIENCES, TICKET_STATUS, PRIORITY, TICKET_CATEGORIES } from '@/lib/constants'
import { toFa, faDateTime, timeAgo } from '@/lib/fa'
import { useToast } from '@/hooks/use-toast'
import { Megaphone, Plus, Trash2, Pin, LifeBuoy, Loader2, Send, MessageSquare } from 'lucide-react'

interface Ann { id: string; title: string; content: string; audience: string; isPinned: boolean; createdAt: string; createdBy?: { name: string } | null }
interface Ticket {
  id: string; subject: string; category: string; priority: string; status: string; createdAt: string; updatedAt: string
  user: { name: string; role: string }
  _count?: { messages: number }
}
interface TicketDetail extends Ticket {
  messages: { id: string; content: string; isStaff: boolean; createdAt: string; sender?: { name: string; role: string } | null }[]
}

export default function CommsView() {
  const { user } = useApp()
  const { toast } = useToast()
  const isStaff = ['ADMIN', 'MANAGER', 'STAFF'].includes(user?.role || '')
  const [tab, setTab] = useState('announcements')
  const [anns, setAnns] = useState<Ann[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', audience: 'ALL', isPinned: false })
  const [ticketDetail, setTicketDetail] = useState<TicketDetail | null>(null)
  const [reply, setReply] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a, t] = await Promise.all([
        api<{ announcements: Ann[] }>('/api/announcements'),
        api<{ tickets: Ticket[] }>('/api/tickets'),
      ])
      setAnns(a.announcements)
      setTickets(t.tickets)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createAnn = async () => {
    setSaving(true)
    try {
      await api('/api/announcements', { method: 'POST', body: JSON.stringify(form) })
      toast({ title: 'اطلاعیه منتشر شد', description: 'برای مخاطبان هدف اعلان ارسال شد' })
      setOpen(false)
      setForm({ title: '', content: '', audience: 'ALL', isPinned: false })
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const openTicket = async (t: Ticket) => {
    try {
      const d = await api<{ ticket: TicketDetail }>(`/api/tickets/${t.id}`)
      setTicketDetail(d.ticket)
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const sendReply = async () => {
    if (!ticketDetail || !reply.trim()) return
    try {
      await api(`/api/tickets/${ticketDetail.id}`, { method: 'POST', body: JSON.stringify({ content: reply }) })
      setReply('')
      openTicket(ticketDetail)
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const setTicketStatus = async (id: string, status: string) => {
    try {
      await api(`/api/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setTicketDetail(ticketDetail ? { ...ticketDetail, status } : null)
      load()
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  if (loading) return <LoadingBlock rows={6} />

  return (
    <div className="space-y-5 fade-up">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="announcements">اطلاعیه‌ها ({toFa(anns.length)})</TabsTrigger>
            <TabsTrigger value="tickets">تیکت‌ها ({toFa(tickets.length)})</TabsTrigger>
          </TabsList>
          {isStaff && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button className="gap-1.5"><Plus className="size-4" />اطلاعیه جدید</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>انتشار اطلاعیه</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5"><Label>عنوان *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>متن *</Label><Textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label>مخاطب</Label>
                      <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(AUDIENCES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer pb-2">
                      <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} className="size-4 accent-teal-600" />
                      سنجاق به بالای صفحه
                    </label>
                  </div>
                  <Button onClick={createAnn} disabled={saving || !form.title || !form.content} className="w-full gap-2">
                    {saving && <Loader2 className="size-4 animate-spin" />}انتشار
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="announcements" className="mt-4">
          <div className="grid md:grid-cols-2 gap-3">
            {anns.length === 0 && <div className="col-span-full"><EmptyState icon={<Megaphone className="size-6" />} title="اطلاعیه‌ای وجود ندارد" /></div>}
            {anns.map((a) => (
              <Card key={a.id} className={`border shadow-sm ${a.isPinned ? 'border-teal-300 bg-teal-50/40' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {a.isPinned && <Pin className="size-4 text-teal-600 shrink-0" />}
                      <p className="font-bold text-sm truncate">{a.title}</p>
                    </div>
                    {isStaff && (
                      <Button variant="ghost" size="icon" onClick={async () => { await api(`/api/announcements?id=${a.id}`, { method: 'DELETE' }); load() }}>
                        <Trash2 className="size-3.5 text-rose-500" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-6">{a.content}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="secondary" className="text-[10px]">{AUDIENCES[a.audience] || a.audience}</Badge>
                    <span className="text-[10px] text-muted-foreground">{a.createdBy?.name} · {timeAgo(a.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          <div className="space-y-2.5 max-h-[65vh] overflow-y-auto chat-scroll">
            {tickets.length === 0 && <EmptyState icon={<LifeBuoy className="size-6" />} title="تیکتی وجود ندارد" />}
            {tickets.map((t) => (
              <button key={t.id} onClick={() => openTicket(t)} className="w-full text-right flex flex-wrap items-center gap-3 rounded-xl border p-3.5 hover:bg-muted/40 transition-colors">
                <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">{t.subject}</p>
                  <p className="text-[10px] text-muted-foreground">{t.user.name} · {TICKET_CATEGORIES[t.category]} · {toFa(t._count?.messages || 0)} پیام · {timeAgo(t.updatedAt)}</p>
                </div>
                <StatusBadge label={PRIORITY[t.priority]?.label || ''} color={PRIORITY[t.priority]?.color || ''} />
                <StatusBadge label={TICKET_STATUS[t.status]?.label || ''} color={TICKET_STATUS[t.status]?.color || ''} />
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Ticket detail */}
      <Dialog open={!!ticketDetail} onOpenChange={(o) => !o && setTicketDetail(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
              {ticketDetail?.subject}
              {ticketDetail && <StatusBadge label={TICKET_STATUS[ticketDetail.status]?.label || ''} color={TICKET_STATUS[ticketDetail.status]?.color || ''} />}
            </DialogTitle>
          </DialogHeader>
          {ticketDetail && (
            <div className="space-y-3">
              <div className="space-y-2">
                {ticketDetail.messages.map((m) => (
                  <div key={m.id} className={`rounded-xl p-3 text-xs leading-6 ${m.isStaff ? 'bg-teal-50 mr-8' : 'bg-muted ml-8'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">{m.sender?.name || 'کاربر'} {m.isStaff && <Badge variant="secondary" className="text-[9px]">پشتیبانی</Badge>}</span>
                      <span className="text-[9px] text-muted-foreground">{faDateTime(m.createdAt)}</span>
                    </div>
                    {m.content}
                  </div>
                ))}
              </div>
              {isStaff && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setTicketStatus(ticketDetail.id, 'IN_PROGRESS')} className="text-[11px]">در حال بررسی</Button>
                  <Button size="sm" variant="outline" onClick={() => setTicketStatus(ticketDetail.id, 'CLOSED')} className="text-[11px]">بستن تیکت</Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input placeholder="پاسخ خود را بنویسید..." value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendReply()} />
                <Button onClick={sendReply} size="icon" className="shrink-0"><Send className="size-4" /></Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
