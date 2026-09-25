import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, branchScope, logAudit, notify } from '@/lib/api-utils'

// GET /api/enrollments?studentId=&classGroupId=&status=
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const sp = req.nextUrl.searchParams

  const where: Record<string, unknown> = {}
  if (user.role === 'STUDENT') where.studentId = user.id
  else if (sp.get('studentId')) where.studentId = sp.get('studentId')
  if (sp.get('classGroupId')) where.classGroupId = sp.get('classGroupId')
  if (sp.get('status')) where.status = sp.get('status')
  if (user.role === 'TEACHER') {
    where.classGroup = { teacherId: user.id }
  } else if (STAFF_ROLES.includes(user.role)) {
    const branchId = sp.get('branchId') || branchScope(user)
    if (branchId) where.classGroup = { ...(where.classGroup as object || {}), branchId }
  }

  const enrollments = await db.enrollment.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, phone: true, studentProfile: { select: { studentCode: true } } } },
      classGroup: {
        select: {
          id: true, name: true, capacity: true, status: true,
          course: { select: { id: true, title: true, price: true, coverColor: true } },
          teacher: { select: { name: true } },
        },
      },
      payments: { select: { amount: true, status: true } },
      installments: true,
      certificate: { select: { code: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  return ok({ enrollments })
}

// POST /api/enrollments — { studentId, classGroupId, discount, installments: n }
export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role) && user.role !== 'STUDENT') return fail('دسترسی غیرمجاز', 403)

  const b = await req.json()
  if (!b.classGroupId) return fail('کلاس الزامی است')
  const studentId = user.role === 'STUDENT' ? user.id : b.studentId
  if (!studentId) return fail('انتخاب دانشجو الزامی است')

  const cls = await db.classGroup.findUnique({
    where: { id: String(b.classGroupId) },
    include: { course: true, _count: { select: { enrollments: true } } },
  })
  if (!cls) return fail('کلاس یافت نشد', 404)
  if (cls._count.enrollments >= cls.capacity) return fail('ظرفیت این کلاس تکمیل است')
  if (cls.status === 'CANCELLED') return fail('این کلاس لغو شده است')

  const dup = await db.enrollment.findUnique({
    where: { studentId_classGroupId: { studentId: String(studentId), classGroupId: String(b.classGroupId) } },
  })
  if (dup) return fail('این دانشجو قبلاً در این کلاس ثبت‌نام کرده است')

  const discount = Number(b.discount) || 0
  const tuition = Math.max(cls.course.price - discount, 0)

  const enrollment = await db.enrollment.create({
    data: {
      studentId: String(studentId),
      classGroupId: String(b.classGroupId),
      discount,
      status: 'ACTIVE',
    },
  })

  // installment plan
  const nInstallments = Number(b.installments) || 1
  if (nInstallments > 1) {
    const per = Math.floor(tuition / nInstallments)
    const remainder = tuition - per * nInstallments
    for (let i = 0; i < nInstallments; i++) {
      const due = new Date()
      due.setMonth(due.getMonth() + i)
      await db.installment.create({
        data: {
          enrollmentId: enrollment.id,
          amount: i === nInstallments - 1 ? per + remainder : per,
          dueDate: due,
          status: i === 0 ? 'PENDING' : 'PENDING',
        },
      })
    }
  }

  await notify(studentId, 'ثبت‌نام موفق', `ثبت‌نام شما در کلاس «${cls.name}» با موفقیت انجام شد`, 'SUCCESS')
  await logAudit(user.id, 'CREATE', 'Enrollment', enrollment.id, `ثبت‌نام در ${cls.name}`)
  return ok({ enrollment }, 201)
}
