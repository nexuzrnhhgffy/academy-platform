import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-utils'

// GET /api/quiz-attempts — my attempts
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const attempts = await db.quizAttempt.findMany({
    where: user.role === 'STUDENT' ? { studentId: user.id } : {},
    include: { quiz: { select: { title: true, classGroup: { select: { name: true, course: { select: { title: true } } } } } } },
    orderBy: { createdAt: 'desc' },
  })
  return ok({ attempts })
}

// POST /api/quiz-attempts — submit answers, auto-grade
// body: { quizId, answers: {questionId: index} }
export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (user.role !== 'STUDENT') return fail('فقط دانشجو می‌تواند آزمون بدهد', 403)

  const b = await req.json()
  if (!b.quizId) return fail('شناسه آزمون الزامی است')

  const quiz = await db.quiz.findUnique({ where: { id: String(b.quizId) }, include: { questions: true } })
  if (!quiz || !quiz.isActive) return fail('آزمون یافت نشد یا غیرفعال است', 404)

  const enrollment = await db.enrollment.findFirst({
    where: { classGroupId: quiz.classGroupId, studentId: user.id },
  })
  if (!enrollment) return fail('شما در این کلاس ثبت‌نام ندارید', 403)

  const existing = await db.quizAttempt.findFirst({ where: { quizId: quiz.id, studentId: user.id } })
  if (existing && existing.finishedAt) return fail('شما قبلاً در این آزمون شرکت کرده‌اید', 409)

  // auto-grade
  const answers = (b.answers || {}) as Record<string, number>
  let earned = 0
  let total = 0
  for (const q of quiz.questions) {
    total += q.score
    if (answers[q.id] === q.correctIndex) earned += q.score
  }
  const score = total > 0 ? Math.round((earned / total) * 100) : 0

  let attempt
  if (existing) {
    attempt = await db.quizAttempt.update({
      where: { id: existing.id },
      data: { answers: JSON.stringify(answers), score, finishedAt: new Date() },
    })
  } else {
    attempt = await db.quizAttempt.create({
      data: {
        quizId: quiz.id,
        enrollmentId: enrollment.id,
        studentId: user.id,
        answers: JSON.stringify(answers),
        score,
        finishedAt: new Date(),
      },
    })
  }
  return ok({ attempt, score, earned, total })
}
