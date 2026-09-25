import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit, notify } from '@/lib/api-utils'

// PATCH /api/submissions/:id — teacher grades { score, feedback }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const { id } = await params

  const b = await req.json()
  const submission = await db.submission.update({
    where: { id },
    data: {
      score: b.score !== undefined ? Number(b.score) : undefined,
      feedback: b.feedback,
      status: 'GRADED',
    },
    include: { assignment: { include: { classGroup: { select: { name: true } } } } },
  })

  await notify(submission.studentId, 'تکلیف شما تصحیح شد', `نمره تکلیف «${submission.assignment.title}»: ${submission.score}`, 'GRADE')
  await logAudit(user.id, 'GRADE', 'Submission', id, `نمره ${submission.score}`)
  return ok({ submission })
}
