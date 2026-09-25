import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit, notify } from '@/lib/api-utils'

// GET /api/certificates
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const certificates = await db.certificate.findMany({
    where: user.role === 'STUDENT' ? { studentId: user.id } : {},
    include: {
      student: { select: { name: true } },
      course: { select: { title: true } },
      enrollment: { select: { classGroup: { select: { name: true } } } },
    },
    orderBy: { issuedAt: 'desc' },
  })
  return ok({ certificates })
}

// POST /api/certificates — manually issue { enrollmentId, grade }
export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const b = await req.json()
  if (!b.enrollmentId) return fail('شناسه ثبت‌نام الزامی است')

  const enrollment = await db.enrollment.findUnique({
    where: { id: String(b.enrollmentId) },
    include: { classGroup: { include: { course: true } } },
  })
  if (!enrollment) return fail('ثبت‌نام یافت نشد', 404)

  const existing = await db.certificate.findUnique({ where: { enrollmentId: enrollment.id } })
  if (existing) return fail('گواهینامه قبلاً صادر شده است')

  const code = 'AC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
  const cert = await db.certificate.create({
    data: {
      code,
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      courseId: enrollment.classGroup.courseId,
      grade: b.grade !== undefined ? Number(b.grade) : null,
    },
  })
  await notify(enrollment.studentId, 'گواهینامه صادر شد', `گواهینامه دوره «${enrollment.classGroup.course.title}» صادر شد. کد: ${code}`, 'SUCCESS')
  await logAudit(user.id, 'CREATE', 'Certificate', cert.id, `صدور گواهینامه ${code}`)
  return ok({ certificate: cert }, 201)
}
