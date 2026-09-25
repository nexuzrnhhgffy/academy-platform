'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/store/app-store'
import { useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingBlock, SectionTitle } from '@/components/shared/ui-bits'
import { toFa, faDateTime } from '@/lib/fa'
import { useToast } from '@/hooks/use-toast'
import { Settings, ScrollText, Save, Loader2, ShieldCheck, Search } from 'lucide-react'

export default function SettingsView() {
  const { user } = useApp()
  const { toast } = useToast()
  const isAdmin = user?.role === 'ADMIN'
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [logs, setLogs] = useState<{ id: string; action: string; entity: string; details?: string | null; createdAt: string; user?: { name: string; role: string } | null }[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, a] = await Promise.all([
        api<{ settings: Record<string, string> }>('/api/settings'),
        isAdmin ? api<{ logs: typeof logs }>('/api/audit') : Promise.resolve({ logs: [] }),
      ])
      setSettings(s.settings)
      setLogs(a.logs)
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    try {
      await api('/api/settings', { method: 'PATCH', body: JSON.stringify(settings) })
      toast({ title: 'تنظیمات ذخیره شد' })
    } catch (e) {
      toast({ title: 'خطا', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingBlock rows={6} />

  const filteredLogs = logs.filter((l) => !q || l.action.includes(q) || (l.details || '').includes(q) || (l.user?.name || '').includes(q))

  return (
    <div className="space-y-5 fade-up">
      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">تنظیمات مؤسسه</TabsTrigger>
          {isAdmin && <TabsTrigger value="audit">گزارش فعالیت‌ها</TabsTrigger>}
        </TabsList>

        <TabsContent value="settings" className="mt-4">
          <Card className="border shadow-sm max-w-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Settings className="size-4 text-teal-600" />اطلاعات مؤسسه</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>نام مؤسسه</Label><Input value={settings.instituteName || ''} onChange={(e) => setSettings({ ...settings, instituteName: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>شعار</Label><Input value={settings.instituteSlogan || ''} onChange={(e) => setSettings({ ...settings, instituteSlogan: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>تلفن</Label><Input value={settings.phone || ''} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>ساعت کاری</Label><Input value={settings.workHours || ''} onChange={(e) => setSettings({ ...settings, workHours: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>آدرس</Label><Input value={settings.address || ''} onChange={(e) => setSettings({ ...settings, address: e.target.value })} /></div>
              <Button onClick={save} disabled={saving} className="gap-2">{saving && <Loader2 className="size-4 animate-spin" />}<Save className="size-4" />ذخیره تنظیمات</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="audit" className="mt-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-sm flex items-center gap-2"><ScrollText className="size-4 text-teal-600" />گزارش فعالیت کاربران</CardTitle>
                  <div className="relative">
                    <Search className="absolute right-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input placeholder="جستجو..." className="pr-8 w-48 h-9" value={q} onChange={(e) => setQ(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto chat-scroll">
                {filteredLogs.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">فعالیتی ثبت نشده</p>}
                {filteredLogs.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 rounded-xl border p-3">
                    <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <ShieldCheck className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold">{l.details || `${l.action} — ${l.entity}`}</p>
                      <p className="text-[10px] text-muted-foreground">{l.user?.name || 'سیستم'} · {faDateTime(l.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
