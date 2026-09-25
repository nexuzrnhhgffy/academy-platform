import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit, notify } from '@/lib/api-utils'

// GET /api/payroll?teacherId=&month=&status=
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const sp = req.nextUrl.searchParams

  const where: Record<string, unknown> = {}
  if (user.role === 'TEACHER') where.teacherId = user.id
  else if (sp.get('teacherId')) where.teacherId = sp.get('teacherId')
  if (sp.get('month')) where.month = sp.get('month')
  if (sp.get('status')) where.status = sp.get('status')

  const payrolls = await db.payroll.findMany({
    where,
    include: { teacher: { select: { id: true, name: true, teacherProfile: { select: { hourlyRate: true, specialty: true } } } } },
    orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
    take: 300,
  })
  return ok({ payrolls })
}

// POST /api/payroll — auto-generate from sessions taught in month, or manual
// body: { teacherId, month, bonus?, deduction?, hourlyRate? }
export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)

  const b = await req.json()
  if (!b.teacherId || !b.month) return fail('مدرس و ماه الزامی است')

  const profile = await db.teacherProfile.findUnique({ where: { userId: String(b.teacherId) } })
  const hourlyRate = Number(b.hourlyRate) || profile?.hourlyRate || 0

  // count completed session hours this month for this teacher
  const monthStart = new Date(`${b.month}-01T00:00:00.000Z`)
  const monthEnd = new Date(monthStart)
  monthEnd.setMonth(monthEnd.getMonth() + 1)

  const sessions = await db.session.findMany({
    where: {
      classGroup: { teacherId: String(b.teacherId) },
      status: 'COMPLETED',
      date: { gte: monthStart, lt: monthEnd },
    },
  })

  const hours = sessions.reduce((sum, s) => {
    const [sh, sm] = (s.startTime || '0:0').split(':').map(Number)
    const [eh, em] = (s.endTime || '0:0').split(':').map(Number)
    return sum + Math.max((eh * 60 + em - sh * 60 - sm) / 60, 0)
  }, 0)

  const base = hours * hourlyRate
  const bonus = Number(b.bonus) || 0
  const deduction = Number(b.deduction) || 0
  const total = base + bonus - deduction

  const existing = await db.payroll.findUnique({
    where: { teacherId_month: { teacherId: String(b.teacherId), month: String(b.month) } },
  })
  if (existing) return fail('فیش حقوقی این ماه برای این مدرس قبلاً صادر شده است')

  const payroll = await db.payroll.create({
    data: {
      teacherId: String(b.teacherId),
      month: String(b.month),
      baseAmount: base,
      hoursCount: hours,
      hourlyRate,
      bonus,
      deduction,
      total: Math.max(total, 0),
    },
  })
  await notify(String(b.teacherId), 'فیش حقوقی جدید', `فیش حقوقی ماه ${b.month} به مبلغ ${total.toLocaleString('fa-IR')} تومان صادر شد`, 'INFO')
  await logAudit(user.id, 'CREATE', 'Payroll', payroll.id, `صدور فیش حقوقی`)
  return ok({ payroll }, 201)
}
