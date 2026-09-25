import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, branchScope } from '@/lib/api-utils'

// GET /api/installments?enrollmentId=&status=overdue
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const sp = req.nextUrl.searchParams

  const where: Record<string, unknown> = {}
  if (user.role === 'STUDENT') {
    where.enrollment = { studentId: user.id }
  } else if (sp.get('enrollmentId')) {
    where.enrollmentId = sp.get('enrollmentId')
  } else if (STAFF_ROLES_CHECK(user.role)) {
    const branchId = sp.get('branchId') || branchScope(user)
    if (branchId) where.enrollment = { classGroup: { branchId } }
  }
  if (sp.get('status')) where.status = sp.get('status')

  const installments = await db.installment.findMany({
    where,
    include: {
      enrollment: {
        select: {
          id: true, student: { select: { name: true, id: true } },
          classGroup: { select: { name: true, course: { select: { title: true } } } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 500,
  })

  // auto-flag overdue
  const now = new Date()
  const toFlag = installments.filter((i) => i.status === 'PENDING' && new Date(i.dueDate) < now)
  for (const i of toFlag) {
    await db.installment.update({ where: { id: i.id }, data: { status: 'OVERDUE' } })
    i.status = 'OVERDUE'
  }
  return ok({ installments })
}

function STAFF_ROLES_CHECK(role: string) {
  return ['ADMIN', 'MANAGER', 'STAFF'].includes(role)
}

// POST — create installment { enrollmentId, amount, dueDate }
export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES_CHECK(user.role)) return fail('دسترسی غیرمجاز', 403)
  const b = await req.json()
  if (!b.enrollmentId || !b.amount) return fail('داده نامعتبر است')
  const inst = await db.installment.create({
    data: {
      enrollmentId: String(b.enrollmentId),
      amount: Number(b.amount),
      dueDate: b.dueDate ? new Date(b.dueDate) : new Date(),
    },
  })
  return ok({ installment: inst }, 201)
}
