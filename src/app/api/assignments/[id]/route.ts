import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES } from '@/lib/api-utils'

// GET /api/assignments/:id — with submissions (teacher) 
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const { id } = await params

  const assignment = await db.assignment.findUnique({
    where: { id },
    include: {
      classGroup: { include: { teacher: { select: { id: true, name: true } } } },
      submissions: {
        include: { student: { select: { id: true, name: true } } },
        orderBy: { submittedAt: 'desc' },
      },
    },
  })
  if (!assignment) return fail('تکلیف یافت نشد', 404)

  if (user.role === 'STUDENT') {
    const enrolled = await db.enrollment.findFirst({ where: { classGroupId: assignment.classGroupId, studentId: user.id } })
    if (!enrolled) return fail('دسترسی غیرمجاز', 403)
    assignment.submissions = assignment.submissions.filter((s) => s.studentId === user.id)
  }
  if (user.role === 'TEACHER' && assignment.classGroup.teacherId !== user.id) return fail('دسترسی غیرمجاز', 403)
  return ok({ assignment })
}
