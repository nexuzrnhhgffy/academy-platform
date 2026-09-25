'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  GraduationCap, Video, Wallet, BarChart3, Building2, Users, CalendarClock,
  FileBadge, Bell, ShieldCheck, MonitorPlay, ClipboardCheck, Sparkles, ArrowLeft,
  Phone, Mail, MapPin, Globe, Award, BookOpenCheck, CheckCircle2, Presentation,
} from 'lucide-react'
import { faDate } from '@/lib/fa'
import { useEffect, useState } from 'react'

interface CoursePreview {
  id: string
  title: string
  description?: string | null
  category: string
  level: string
  price: number
  coverColor: string
  sessionsCount: number
  durationHours: number
}

const FEATURES = [
  { icon: Video, title: 'کلاس آنلاین و لایو', desc: 'برگزاری جلسات زنده با چت هم‌زمان، دست‌بلندکردن، وایت‌برد مشترک و ذخیره‌ی جلسات برای مرور بعدی' },
  { icon: CalendarClock, title: 'مدیریت کلاس و برنامه', desc: 'تعریف دوره، تشکیل کلاس، زمان‌بندی جلسات و حضور و غیاب دقیق در هر جلسه' },
  { icon: Wallet, title: 'مالی و حسابداری', desc: 'پرداخت آنلاین، اقساط، فیش حقوقی اساتید، مدیریت هزینه‌ها و گزارش‌های کامل درآمد و هزینه' },
  { icon: Building2, title: 'چند شعبه‌ای', desc: 'مدیریت هم‌زمان چند شعبه با مدیر مستقل، سالن‌ها و کلاس‌های مخصوص هر شعبه' },
  { icon: ClipboardCheck, title: 'تکلیف و آزمون', desc: 'ثبت تکالیف، تصحیح و نمره‌دهی، آزمون‌های چهارگزینه‌ای با تصحیح خودکار' },
  { icon: FileBadge, title: 'گواهینامه معتبر', desc: 'صدور خودکار گواهینامه با کد رهگیری قابل استعلام برای هر دوره' },
  { icon: Bell, title: 'اطلاع‌رسانی هوشمند', desc: 'اعلان لحظه‌ای شروع کلاس، تکلیف جدید، پرداخت و اطلاعیه‌های موسسه' },
  { icon: BarChart3, title: 'داشبورد مدیریتی', desc: 'نمودارهای درآمد، آمار دانشجویان، رتبه کلاس‌ها و گزارش‌های لحظه‌ای برای تصمیم‌گیری' },
  { icon: ShieldCheck, title: 'امنیت و سطوح دسترسی', desc: 'پنج سطح دسترسی مجزا: مدیر، مدیر شعبه، مدرس، دانشجو و کارمند پذیرش' },
]

const STEPS = [
  { n: '۱', title: 'ثبت‌نام کنید', desc: 'در کمتر از یک دقیقه حساب دانشجویی بسازید' },
  { n: '۲', title: 'دوره و کلاس انتخاب کنید', desc: 'از میان دوره‌های حضوری و آنلاین' },
  { n: '۳', title: 'پرداخت و شروع یادگیری', desc: 'پرداخت کامل یا اقساطی، حضوری یا لایو' },
  { n: '۴', title: 'گواهینامه بگیرید', desc: 'با پایان دوره، گواهینامه استعلام‌دار دریافت کنید' },
]

const TESTIMONIALS = [
  { name: 'مهسا تهرانی', role: 'دانشجوی دوره پایتون', text: 'امکان دیدن دوباره‌ی ضبط جلسات برای من معجزه بود؛ هر جا گیر می‌کردم دوباره تماشا می‌کردم.' },
  { name: 'دکتر کاویانی', role: 'مدرس ریاضیات', text: 'حضور و غیاب، تکالیف و حقوق من همه در یک جای جمع‌شده است. مدیریت آموزش دیگر کاغذبازی نیست.' },
  { name: 'شرکت آریانا', role: 'کارفرما', text: 'گواهینامه‌های اعضای تیم‌مان را با کد رهگیری استعلام کردیم؛ همه معتبر بودند.' },
]

const colorMap: Record<string, string> = {
  emerald: 'from-emerald-500 to-teal-600',
  cyan: 'from-cyan-500 to-sky-600',
  violet: 'from-violet-500 to-purple-600',
  amber: 'from-amber-500 to-orange-600',
  rose: 'from-rose-500 to-pink-600',
  teal: 'from-teal-500 to-emerald-600',
}

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [courses, setCourses] = useState<CoursePreview[]>([])
  const [stats, setStats] = useState({ students: 0, teachers: 0, courses: 0, branches: 0 })

  useEffect(() => {
    fetch('/api/landing')
      .then((r) => r.json())
      .then((d) => {
        if (d.courses) setCourses(d.courses.slice(0, 6))
        if (d.stats) setStats(d.stats)
      })
      .catch(() => {})
  }, [])

  const money = (n: number) => new Intl.NumberFormat('fa-IR').format(n)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-teal-50/60 via-background to-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
              <GraduationCap className="size-5.5" />
            </div>
            <div>
              <p className="font-extrabold text-lg leading-tight">آکادمی نخبگان</p>
              <p className="text-[10px] text-muted-foreground">پلتفرم جامع مدیریت آموزش</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">امکانات</a>
            <a href="#courses" className="hover:text-foreground transition-colors">دوره‌ها</a>
            <a href="#how" className="hover:text-foreground transition-colors">نحوه شروع</a>
            <a href="#contact" className="hover:text-foreground transition-colors">تماس</a>
          </nav>
          <Button onClick={onEnter} className="gap-2">
            ورود / ثبت‌نام
            <ArrowLeft className="size-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 right-10 size-72 rounded-full bg-teal-200/40 blur-3xl" />
            <div className="absolute top-40 left-10 size-80 rounded-full bg-emerald-200/40 blur-3xl" />
          </div>
          <div className="max-w-6xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28 grid lg:grid-cols-2 gap-12 items-center">
            <div className="fade-up">
              <Badge className="mb-4 gap-1.5 bg-teal-100 text-teal-800 border-0 hover:bg-teal-100">
                <Sparkles className="size-3.5" />
                از ثبت‌نام تا گواهینامه، همه‌چیز یک‌جا
              </Badge>
              <h1 className="text-3xl md:text-5xl font-extrabold leading-[1.25]">
                مؤسسه آموزشی شما،
                <br />
                <span className="bg-gradient-to-l from-teal-600 to-emerald-500 bg-clip-text text-transparent">
                  هوشمند و کامل
                </span>
              </h1>
              <p className="mt-5 text-muted-foreground text-base md:text-lg leading-8">
                سامانه جامع مدیریت آموزش: ثبت‌نام آنلاین، کلاس‌های حضوری و لایو، ذخیره جلسات،
                مالی و حسابداری، مدیریت چند شعبه و داشبوردهای اختصاصی مدیر، مدرس و دانشجو.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={onEnter} className="gap-2 text-base h-12 px-7">
                  شروع کنید
                  <ArrowLeft className="size-4.5" />
                </Button>
                <Button size="lg" variant="outline" onClick={onEnter} className="gap-2 text-base h-12 px-7">
                  <MonitorPlay className="size-4.5" />
                  مشاهده داشبورد نمایشی
                </Button>
              </div>
              <div className="mt-10 grid grid-cols-4 gap-3 text-center max-w-md">
                {[
                  { v: stats.students, l: 'دانشجو' },
                  { v: stats.teachers, l: 'استاد' },
                  { v: stats.courses, l: 'دوره' },
                  { v: stats.branches, l: 'شعبه' },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl bg-white/70 border py-3 shadow-sm">
                    <p className="text-xl md:text-2xl font-extrabold text-teal-700">{new Intl.NumberFormat('fa-IR').format(s.v)}+</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock dashboard preview */}
            <div className="fade-up hidden lg:block" style={{ animationDelay: '150ms' }}>
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-teal-400/20 to-emerald-400/10 rounded-3xl blur-xl" />
                <div className="relative rounded-2xl border bg-white shadow-2xl overflow-hidden">
                  <div className="h-9 bg-slate-50 border-b flex items-center gap-1.5 px-4">
                    <span className="size-2.5 rounded-full bg-rose-400" />
                    <span className="size-2.5 rounded-full bg-amber-400" />
                    <span className="size-2.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-muted-foreground mr-2">dashboards.academy.ir</span>
                  </div>
                  <div className="p-5 grid grid-cols-3 gap-3">
                    {[
                      { icon: Video, t: 'کلاس لایو', v: '۲ در حال برگزاری', c: 'bg-rose-50 text-rose-600' },
                      { icon: Users, t: 'دانشجویان', v: '۸ نفر فعال', c: 'bg-teal-50 text-teal-600' },
                      { icon: Wallet, t: 'درآمد ماه', v: '۸۴ میلیون', c: 'bg-emerald-50 text-emerald-600' },
                    ].map((k) => (
                      <div key={k.t} className="rounded-xl border p-3">
                        <div className={`size-8 rounded-lg flex items-center justify-center mb-2 ${k.c}`}>
                          <k.icon className="size-4" />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{k.t}</p>
                        <p className="text-xs font-bold mt-0.5">{k.v}</p>
                      </div>
                    ))}
                    <div className="col-span-3 rounded-xl border p-4">
                      <div className="flex items-end justify-between gap-2 h-28">
                        {[42, 68, 55, 80, 62, 92, 74, 88, 60, 95, 70, 85].map((h, i) => (
                          <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-teal-500 to-emerald-400" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center mt-2">نمودار درآمد ۱۲ ماه گذشته</p>
                    </div>
                    <div className="col-span-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/60 p-3">
                      <span className="size-2 rounded-full bg-rose-500 live-dot" />
                      <p className="text-xs font-medium text-rose-700">جلسه ویژه — رفع اشکال پروژه · هم‌اکنون در حال برگزاری</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-16 md:py-24 bg-white/60 border-y">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl md:text-3xl font-extrabold">هر چیزی که یک مؤسسه نیاز دارد</h2>
              <p className="text-muted-foreground mt-3 leading-7">
                حتی چیزهایی که فکرش را هم نکرده بودید؛ از برگزاری جلسه لایو با وایت‌برد مشترک
                تا حسابداری، حقوق اساتید و مدیریت اقساط.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f, i) => (
                <Card key={f.title} className="border bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all" style={{ animationDelay: `${i * 40}ms` }}>
                  <CardContent className="p-5">
                    <div className="size-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-md mb-4">
                      <f.icon className="size-5" />
                    </div>
                    <h3 className="font-bold">{f.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-6">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Courses */}
        <section id="courses" className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold">دوره‌های آموزشی</h2>
                <p className="text-muted-foreground mt-2">با اساتید برتر و امکان شرکت حضوری یا لایو</p>
              </div>
              <Button variant="ghost" onClick={onEnter} className="gap-1.5">
                همه دوره‌ها <ArrowLeft className="size-4" />
              </Button>
            </div>
            {courses.length === 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {['برنامه‌نویسی پایتون', 'مکالمه انگلیسی', 'ریاضیات کنکور', 'طراحی وب', 'دیجیتال مارکتینگ', 'گرافیک'].map((t, i) => (
                  <Card key={t} className="overflow-hidden border">
                    <div className={`h-28 bg-gradient-to-br ${['from-emerald-500 to-teal-600', 'from-cyan-500 to-sky-600', 'from-amber-500 to-orange-600', 'from-violet-500 to-purple-600', 'from-rose-500 to-pink-600', 'from-teal-500 to-emerald-600'][i]} flex items-center justify-center text-white`}>
                      <BookOpenCheck className="size-8" />
                    </div>
                    <CardContent className="p-4">
                      <p className="font-bold">{t}</p>
                      <p className="text-xs text-muted-foreground mt-1">ثبت‌نام باز است</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((c) => (
                  <Card key={c.id} className="overflow-hidden border hover:shadow-lg transition-shadow group">
                    <div className={`h-24 bg-gradient-to-br ${colorMap[c.coverColor] || colorMap.emerald} relative flex items-center justify-center text-white`}>
                      <BookOpenCheck className="size-7 opacity-80 group-hover:scale-110 transition-transform" />
                      <span className="absolute top-2 right-2 text-[10px] bg-white/25 backdrop-blur rounded-full px-2 py-0.5">{c.level}</span>
                    </div>
                    <CardContent className="p-4">
                      <p className="font-bold">{c.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-8">{c.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm font-extrabold text-teal-700">{money(c.price)} تومان</span>
                        <span className="text-[11px] text-muted-foreground">{new Intl.NumberFormat('fa-IR').format(c.sessionsCount)} جلسه</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-16 md:py-20 bg-teal-950 text-teal-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-extrabold">شروع کار خیلی ساده است</h2>
              <p className="text-teal-200/70 mt-3">چهار قدم تا اولین کلاس شما</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STEPS.map((s) => (
                <div key={s.n} className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors">
                  <div className="size-11 rounded-full bg-teal-400/20 text-teal-300 font-extrabold flex items-center justify-center text-lg mb-4">
                    {s.n}
                  </div>
                  <h3 className="font-bold">{s.title}</h3>
                  <p className="text-sm text-teal-100/60 mt-2 leading-6">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-extrabold">حرف‌های کاربران ما</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {TESTIMONIALS.map((t) => (
                <Card key={t.name} className="border bg-card">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Award key={i} className="size-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm leading-7 text-muted-foreground">«{t.text}»</p>
                    <div className="mt-4 flex items-center gap-2.5">
                      <div className="size-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{t.name}</p>
                        <p className="text-[11px] text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20">
          <div className="max-w-4xl mx-auto px-4">
            <div className="rounded-3xl bg-gradient-to-l from-teal-600 to-emerald-500 p-10 md:p-14 text-center text-white shadow-xl">
              <Presentation className="size-10 mx-auto mb-4 opacity-90" />
              <h2 className="text-2xl md:text-3xl font-extrabold">آماده‌اید مسیر یادگیری‌تان را شروع کنید؟</h2>
              <p className="mt-3 text-white/85">همین حالا ثبت‌نام کنید یا با حساب نمایشی سیستم را ببینید</p>
              <Button size="lg" onClick={onEnter} className="mt-7 h-12 px-8 text-base bg-white text-teal-700 hover:bg-teal-50">
                ورود به سامانه
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer — sticky bottom via mt-auto */}
      <footer id="contact" className="mt-auto bg-teal-950 text-teal-100/80 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="size-9 rounded-xl bg-teal-400/20 flex items-center justify-center text-teal-300">
                <GraduationCap className="size-5" />
              </div>
              <p className="font-extrabold text-white">آکادمی نخبگان</p>
            </div>
            <p className="text-sm leading-7">پلتفرم جامع مدیریت مؤسسه آموزشی؛ از ثبت‌نام و کلاس لایو تا مالی و گواهینامه — همه در یک سامانه.</p>
          </div>
          <div className="space-y-3 text-sm">
            <p className="font-bold text-white mb-3">تماس با ما</p>
            <p className="flex items-center gap-2"><Phone className="size-4 text-teal-400" /> ۰۲۱-۹۱۰۰۲۰۳۰</p>
            <p className="flex items-center gap-2"><Mail className="size-4 text-teal-400" /> info@academy.ir</p>
            <p className="flex items-center gap-2"><MapPin className="size-4 text-teal-400" /> تهران، خیابان ولیعصر، برج آموزش</p>
          </div>
          <div className="space-y-3 text-sm">
            <p className="font-bold text-white mb-3">دسترسی سریع</p>
            <button onClick={onEnter} className="flex items-center gap-2 hover:text-teal-300 transition-colors"><Globe className="size-4 text-teal-400" /> ورود به داشبورد</button>
            <p className="flex items-center gap-2"><ShieldCheck className="size-4 text-teal-400" /> استعلام گواهینامه</p>
            <p className="flex items-center gap-2"><CheckCircle2 className="size-4 text-teal-400" /> شرایط و مقررات</p>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-teal-100/50">
          © ۱۴۰۴ آکادمی نخبگان — تمامی حقوق محفوظ است
        </div>
      </footer>
    </div>
  )
}
