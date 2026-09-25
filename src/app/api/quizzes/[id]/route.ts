import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser } from '@/lib/api-utils'

// GET /api/quizzes/:id — questions (correctIndex hidden for students)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const { id } = await params

  const quiz = await db.quiz.findUnique({
    where: { id },
    include: {
      classGroup: { select: { name: true, course: { select: { title: true } } } },
      questions: { orderBy: { id: 'asc' } },
      attempts: { include: { enrollment: { include: { student: { select: { id: true, name: true } } } } } },
    },
  })
  if (!quiz) return fail('آزمون یافت نشد', 404)

  if (user.role === 'STUDENT') {
    const enrolled = await db.enrollment.findFirst({ where: { classGroupId: quiz.classGroupId as unknown as string, studentId: user.id } })
    if (!enrolled || !quiz.isActive) return fail('دسترسی غیرمجاز', 403)
    const questions = quiz.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: JSON.parse(q.options || '[]'),
      score: q.score,
    }))
    const myAttempt = quiz.attempts.find((a) => a.studentId === user.id) || null
    return ok({ quiz: { ...quiz, questions, attempts: undefined, myAttempt } })
  }
  return ok({ quiz: { ...quiz, questions: quiz.questions.map((q) => ({ ...q, options: JSON.parse(q.options || '[]') })) } })
}
