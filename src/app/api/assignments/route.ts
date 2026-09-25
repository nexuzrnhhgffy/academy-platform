import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit } from '@/lib/api-utils'

// GET /api/assignments?classGroupId=
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const sp = req.nextUrl.searchParams

  const where: Record<string, unknown> = {}
  if (sp.get('classGroupId')) where.classGroupId = sp.get('classGroupId')
  if (user.role === 'TEACHER') where.classGroup = { teacherId: user.id }
  if (user.role === 'STUDENT') where.classGroup = { enrollments: { some: { studentId: user.id } } }

  const assignments = await db.assignment.findMany({
    where,
    include: {
      classGroup: { select: { name: true, course: { select: { title: true } } } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // for students: include own submission
  if (user.role === 'STUDENT') {
    const mySubs = await db.submission.findMany({ where: { studentId: user.id } })
    const enriched = assignments.map((a) => ({
      ...a,
      mySubmission: mySubs.find((s) => s.assignmentId === a.id) || null,
    }))
    return ok({ assignments: enriched })
  }
  return ok({ assignments })
}

// POST /api/assignments
export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const b = await req.json()
  if (!b.classGroupId || !b.title) return fail('کلاس و عنوان الزامی است')

  const cls = await db.classGroup.findUnique({ where: { id: String(b.classGroupId) } })
  if (!cls) return fail('کلاس یافت نشد', 404)
  const isOwnerTeacher = user.role === 'TEACHER' && cls.teacherId === user.id
  if (!STAFF_ROLES.includes(user.role) && !isOwnerTeacher) return fail('دسترسی غیرمجاز', 403)

  const assignment = await db.assignment.create({
    data: {
      classGroupId: String(b.classGroupId),
      title: String(b.title),
      description: b.description || null,
      dueDate: b.dueDate ? new Date(b.dueDate) : null,
      maxScore: Number(b.maxScore) || 100,
    },
  })

  // notify students
  const enrolled = await db.enrollment.findMany({ where: { classGroupId: cls.id, status: 'ACTIVE' } })
  for (const e of enrolled) {
    await db.notification.create({
      data: { userId: e.studentId, title: 'تکلیف جدید', body: `تکلیف «${assignment.title}» برای کلاس ${cls.name} ثبت شد`, type: 'ASSIGNMENT' },
    })
  }
  await logAudit(user.id, 'CREATE', 'Assignment', assignment.id, `ایجاد تکلیف ${assignment.title}`)
  return ok({ assignment }, 201)
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return fail('شناسه لازم است')
  await db.assignment.delete({ where: { id } })
  return ok({ ok: true })
}
