import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, branchScope, logAudit, genRefCode, notify } from '@/lib/api-utils'

// GET /api/payments?studentId=&method=&status=&from=&to=
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const sp = req.nextUrl.searchParams

  const where: Record<string, unknown> = {}
  if (user.role === 'STUDENT') where.studentId = user.id
  else if (sp.get('studentId')) where.studentId = sp.get('studentId')
  else if (STAFF_ROLES.includes(user.role)) {
    const branchId = sp.get('branchId') || branchScope(user)
    if (branchId) where.branchId = branchId
  }
  if (sp.get('method')) where.method = sp.get('method')
  if (sp.get('status')) where.status = sp.get('status')
  if (sp.get('from') || sp.get('to')) {
    where.paidAt = {}
    if (sp.get('from')) (where.paidAt as Record<string, unknown>).gte = new Date(sp.get('from')!)
    if (sp.get('to')) (where.paidAt as Record<string, unknown>).lte = new Date(sp.get('to')!)
  }

  const payments = await db.payment.findMany({
    where,
    include: {
      student: { select: { id: true, name: true } },
      enrollment: { select: { id: true, classGroup: { select: { name: true, course: { select: { title: true } } } } } },
      branch: { select: { name: true } },
    },
    orderBy: { paidAt: 'desc' },
    take: 500,
  })

  const total = payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0)
  return ok({ payments, total })
}

// POST /api/payments — { studentId, enrollmentId?, amount, method, note }
export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const b = await req.json()
  if (!b.amount || Number(b.amount) <= 0) return fail('مبلغ نامعتبر است')

  let studentId = b.studentId
  let branchId = user.role === 'ADMIN' ? b.branchId || null : user.branchId

  if (user.role === 'STUDENT') {
    studentId = user.id
    if (b.enrollmentId) {
      const enr = await db.enrollment.findUnique({ where: { id: String(b.enrollmentId) }, include: { classGroup: true } })
      if (!enr || enr.studentId !== user.id) return fail('دسترسی غیرمجاز', 403)
      branchId = enr.classGroup.branchId
    }
  } else if (!STAFF_ROLES.includes(user.role)) {
    return fail('دسترسی غیرمجاز', 403)
  } else if (b.enrollmentId) {
    const enr = await db.enrollment.findUnique({ where: { id: String(b.enrollmentId) }, include: { classGroup: true } })
    if (enr) {
      studentId = studentId || enr.studentId
      branchId = enr.classGroup.branchId
    }
  }
  if (!studentId) return fail('انتخاب دانشجو الزامی است')

  const payment = await db.payment.create({
    data: {
      studentId: String(studentId),
      enrollmentId: b.enrollmentId || null,
      branchId,
      amount: Number(b.amount),
      method: b.method || 'CASH',
      status: 'PAID',
      refCode: b.refCode || genRefCode(),
      note: b.note || null,
      paidAt: b.paidAt ? new Date(b.paidAt) : new Date(),
    },
  })

  // mark related installment paid if asked
  if (b.installmentId) {
    await db.installment.update({ where: { id: String(b.installmentId) }, data: { status: 'PAID', paidAt: new Date() } })
  }

  await notify(String(studentId), 'پرداخت ثبت شد', `پرداخت مبلغ ${Number(b.amount).toLocaleString('fa-IR')} تومان با موفقیت ثبت شد`, 'SUCCESS')
  await logAudit(user.id, 'CREATE', 'Payment', payment.id, `ثبت پرداخت ${payment.amount}`)
  return ok({ payment }, 201)
}
