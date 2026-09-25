import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, logAudit, notify } from '@/lib/api-utils'

// POST /api/submissions — student submits { assignmentId, content, fileUrl }
export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (user.role !== 'STUDENT') return fail('فقط دانشجو می‌تواند تکلیف ارسال کند', 403)

  const b = await req.json()
  if (!b.assignmentId) return fail('شناسه تکلیف الزامی است')

  const enrollment = await db.enrollment.findFirst({
    where: { classGroupId: (await db.assignment.findUnique({ where: { id: String(b.assignmentId) } }))?.classGroupId || '', studentId: user.id },
  })
  if (!enrollment) return fail('شما در این کلاس ثبت‌نام ندارید', 403)

  const existing = await db.submission.findFirst({ where: { assignmentId: String(b.assignmentId), studentId: user.id } })
  let submission
  if (existing) {
    submission = await db.submission.update({
      where: { id: existing.id },
      data: { content: b.content || null, fileUrl: b.fileUrl || null, status: 'SUBMITTED', submittedAt: new Date() },
    })
  } else {
    submission = await db.submission.create({
      data: {
        assignmentId: String(b.assignmentId),
        enrollmentId: enrollment.id,
        studentId: user.id,
        content: b.content || null,
        fileUrl: b.fileUrl || null,
      },
    })
  }
  return ok({ submission }, 201)
}
