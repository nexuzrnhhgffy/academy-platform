import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit, notify } from '@/lib/api-utils'

// GET /api/quizzes?classGroupId=
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const sp = req.nextUrl.searchParams

  const where: Record<string, unknown> = {}
  if (sp.get('classGroupId')) where.classGroupId = sp.get('classGroupId')
  if (user.role === 'TEACHER') where.classGroup = { teacherId: user.id }
  if (user.role === 'STUDENT') {
    where.classGroup = { enrollments: { some: { studentId: user.id } } }
    where.isActive = true
  }

  const quizzes = await db.quiz.findMany({
    where,
    include: {
      classGroup: { select: { name: true, course: { select: { title: true } } } },
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (user.role === 'STUDENT') {
    const myAttempts = await db.quizAttempt.findMany({ where: { studentId: user.id } })
    return ok({ quizzes: quizzes.map((q) => ({ ...q, myAttempt: myAttempts.find((a) => a.quizId === q.id) || null })) })
  }
  return ok({ quizzes })
}

// POST /api/quizzes — { classGroupId, title, description, durationMin, questions: [{text, options[], correctIndex, score}] }
export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const b = await req.json()
  if (!b.classGroupId || !b.title || !Array.isArray(b.questions) || b.questions.length === 0) {
    return fail('عنوان، کلاس و حداقل یک سوال الزامی است')
  }

  const cls = await db.classGroup.findUnique({ where: { id: String(b.classGroupId) } })
  if (!cls) return fail('کلاس یافت نشد', 404)
  const isOwnerTeacher = user.role === 'TEACHER' && cls.teacherId === user.id
  if (!STAFF_ROLES.includes(user.role) && !isOwnerTeacher) return fail('دسترسی غیرمجاز', 403)

  const quiz = await db.quiz.create({
    data: {
      classGroupId: String(b.classGroupId),
      title: String(b.title),
      description: b.description || null,
      durationMin: Number(b.durationMin) || 15,
      questions: {
        create: b.questions.map((q: { text: string; options: string[]; correctIndex: number; score?: number }) => ({
          text: String(q.text),
          options: JSON.stringify(q.options || []),
          correctIndex: Number(q.correctIndex) || 0,
          score: Number(q.score) || 1,
        })),
      },
    },
    include: { questions: true },
  })

  const enrolled = await db.enrollment.findMany({ where: { classGroupId: cls.id, status: 'ACTIVE' } })
  for (const e of enrolled) {
    await notify(e.studentId, 'آزمون جدید', `آزمون «${quiz.title}» برای کلاس ${cls.name} فعال شد`, 'QUIZ')
  }
  await logAudit(user.id, 'CREATE', 'Quiz', quiz.id, `ایجاد آزمون ${quiz.title}`)
  return ok({ quiz }, 201)
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return fail('شناسه لازم است')
  await db.quiz.delete({ where: { id } })
  return ok({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const b = await req.json()
  if (!b.id) return fail('شناسه لازم است')
  const quiz = await db.quiz.update({ where: { id: String(b.id) }, data: { isActive: Boolean(b.isActive) } })
  return ok({ quiz })
}
