import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit, notify } from '@/lib/api-utils'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const { id } = await params

  const b = await req.json()
  const data: Record<string, unknown> = {}
  if (b.status) data.status = b.status
  if (b.discount !== undefined) data.discount = Number(b.discount)
  if (b.finalGrade !== undefined) data.finalGrade = Number(b.finalGrade)

  const enrollment = await db.enrollment.update({
    where: { id },
    data,
    include: { classGroup: { include: { course: true } }, student: { select: { name: true } } },
  })

  // issue certificate automatically when completed with passing grade
  if (b.status === 'COMPLETED' && b.finalGrade !== undefined && Number(b.finalGrade) >= 50) {
    const existing = await db.certificate.findUnique({ where: { enrollmentId: id } })
    if (!existing) {
      const code = 'AC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
      await db.certificate.create({
        data: {
          code,
          enrollmentId: id,
          studentId: enrollment.studentId,
          courseId: enrollment.classGroup.courseId,
          grade: Number(b.finalGrade),
        },
      })
      await notify(enrollment.studentId, 'گواهینامه صادر شد', `گواهینامه پایان دوره «${enrollment.classGroup.course.title}» برای شما صادر شد. کد پیگیری: ${code}`, 'SUCCESS')
    }
  }

  await logAudit(user.id, 'UPDATE', 'Enrollment', id, `تغییر وضعیت ثبت‌نام به ${b.status || '—'}`)
  return ok({ enrollment })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const { id } = await params
  await db.enrollment.delete({ where: { id } })
  await logAudit(user.id, 'DELETE', 'Enrollment', id, 'حذف ثبت‌نام')
  return ok({ ok: true })
}
