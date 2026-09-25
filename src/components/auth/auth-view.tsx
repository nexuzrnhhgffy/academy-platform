'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { GraduationCap, ArrowRight, User, Lock, Phone, Mail, IdCard, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'

const DEMO_ACCOUNTS = [
  { role: 'مدیر سیستم', id: 'admin@academy.ir' },
  { role: 'مدیر شعبه', id: 'manager@academy.ir' },
  { role: 'مدرس', id: 'teacher@academy.ir' },
  { role: 'دانشجو', id: 'student@academy.ir' },
  { role: 'پذیرش', id: 'staff@academy.ir' },
]

export default function AuthView({ onBack }: { onBack: () => void }) {
  const { login, register } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' })
  const [regForm, setRegForm] = useState({ name: '', phone: '', email: '', password: '', nationalId: '' })

  const doLogin = async (e?: React.FormEvent, quick?: { id: string }) => {
    e?.preventDefault()
    setLoading(true)
    try {
      const identifier = quick?.id || loginForm.identifier
      const password = quick ? '123456' : loginForm.password
      if (!identifier || !password) throw new Error('نام کاربری و رمز عبور را وارد کنید')
      const u = await login(identifier, password)
      toast({ title: `خوش آمدید ${u.name} 👋`, description: 'ورود با موفقیت انجام شد' })
    } catch (err) {
      toast({ title: 'خطا در ورود', description: err instanceof Error ? err.message : 'دوباره تلاش کنید', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const doRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (!regForm.name || !regForm.phone || !regForm.password) {
        throw new Error('نام، شماره تماس و رمز عبور الزامی است')
      }
      const u = await register({
        name: regForm.name,
        phone: regForm.phone,
        email: regForm.email || undefined,
        password: regForm.password,
        nationalId: regForm.nationalId || undefined,
      })
      toast({ title: `خوش آمدید ${u.name} 🎉`, description: 'ثبت‌نام شما کامل شد' })
    } catch (err) {
      toast({ title: 'خطا در ثبت‌نام', description: err instanceof Error ? err.message : 'دوباره تلاش کنید', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Side panel */}
      <div className="lg:w-[42%] bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-900 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-20 -left-20 size-72 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-96 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative">
          <button onClick={onBack} className="flex items-center gap-1.5 text-teal-100/80 hover:text-white transition-colors text-sm mb-10">
            <ArrowRight className="size-4" />
            بازگشت به صفحه اصلی
          </button>
          <div className="flex items-center gap-3 mb-8">
            <div className="size-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <p className="font-extrabold text-xl">آکادمی نخبگان</p>
              <p className="text-teal-200/70 text-xs mt-0.5">پلتفرم جامع مدیریت آموزش</p>
            </div>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold leading-relaxed">
            یک حساب کاربری؛
            <br />
            دسترسی به همه امکانات
          </h2>
          <ul className="mt-8 space-y-3 text-sm text-teal-100/80">
            {['شرکت در کلاس‌های لایو و تماشای ضبط جلسات', 'پیگیری تکالیف، آزمون‌ها و نمرات', 'پرداخت شهریه و مشاهده اقساط', 'دریافت گواهینامه استعلام‌دار'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-teal-300" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mt-10">
          <p className="text-xs text-teal-200/60 mb-3 font-medium">حساب‌های نمایشی (رمز همه: ۱۲۳۴۵۶)</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.id}
                onClick={() => doLogin(undefined, { id: a.id })}
                disabled={loading}
                className="rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur px-3.5 py-1.5 text-xs transition-colors disabled:opacity-50"
              >
                {a.role}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <Card className="w-full max-w-md border shadow-xl">
          <Tabs defaultValue="login" dir="rtl">
            <CardHeader className="pb-2">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">ورود</TabsTrigger>
                <TabsTrigger value="register">ثبت‌نام</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <TabsContent value="login">
                <form onSubmit={doLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="identifier">شماره تماس یا ایمیل</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
                      <Input id="identifier" className="pr-9" placeholder="admin@academy.ir" value={loginForm.identifier} onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">رمز عبور</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
                      <Input id="password" type={showPass ? 'text' : 'password'} className="pr-9 pl-9" placeholder="••••••" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground">
                        {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? <Loader2 className="size-4 animate-spin" /> : 'ورود به حساب'}
                  </Button>
                  <Separator className="my-2" />
                  <p className="text-[11px] text-center text-muted-foreground leading-5">
                    حساب نمایشی: <b>admin@academy.ir</b> — رمز: <b>123456</b>
                  </p>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={doRegister} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label>نام و نام خانوادگی *</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
                      <Input className="pr-9" placeholder="مثلاً علی رضایی" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>شماره تماس *</Label>
                      <div className="relative">
                        <Phone className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
                        <Input className="pr-9" placeholder="09xxxxxxxxx" value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>کد ملی</Label>
                      <div className="relative">
                        <IdCard className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
                        <Input className="pr-9" placeholder="اختیاری" value={regForm.nationalId} onChange={(e) => setRegForm({ ...regForm, nationalId: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>ایمیل</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
                      <Input className="pr-9" placeholder="اختیاری" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>رمز عبور *</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
                      <Input type="password" className="pr-9" placeholder="حداقل ۶ کاراکتر" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? <Loader2 className="size-4 animate-spin" /> : 'ایجاد حساب دانشجویی'}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
