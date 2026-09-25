import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, branchScope } from '@/lib/api-utils'

// GET /api/dashboard — role-aware stats for all dashboards
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  const branchId = branchScope(user)

  if (['ADMIN', 'MANAGER', 'STAFF'].includes(user.role)) {
    const [students, teachers, activeClasses, sessions, payments, expenses, enrollments, liveSessions, announcements] = await Promise.all([
      db.user.count({ where: { role: 'STUDENT', isActive: true, ...(branchId ? { branchId } : {}) } }),
      db.user.count({ where: { role: 'TEACHER', isActive: true, ...(branchId ? { branchId } : {}) } }),
      db.classGroup.count({ where: { status: 'ACTIVE', ...(branchId ? { branchId } : {}) } }),
      db.session.findMany({
        where: { classGroup: branchId ? { branchId } : {}, status: { in: ['SCHEDULED', 'LIVE'] }, date: { gte: new Date(Date.now() - 86400000) } },
        include: { classGroup: { select: { name: true, course: { select: { title: true } }, teacher: { select: { name: true } } } } },
        orderBy: { date: 'asc' },
        take: 8,
      }),
      db.payment.aggregate({ where: { status: 'PAID', ...(branchId ? { branchId } : {}) }, _sum: { amount: true }, _count: true }),
      db.expense.aggregate({ where: branchId ? { branchId } : {}, _sum: { amount: true } }),
      db.enrollment.count({ where: branchId ? { classGroup: { branchId } } : {} }),
      db.session.findMany({ where: { status: 'LIVE', ...(branchId ? { classGroup: { branchId } } : {}) }, include: { classGroup: { select: { name: true } } } }),
      db.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 3, include: { createdBy: { select: { name: true } } } }),
    ])

    // monthly revenue series (last 6 months)
    const paymentsList = await db.payment.findMany({
      where: { status: 'PAID', ...(branchId ? { branchId } : {}), paidAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) } },
      select: { amount: true, paidAt: true },
    })
    const series: { month: string; income: number }[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      series.push({ month: key, income: 0 })
    }
    for (const p of paymentsList) {
      const dt = new Date(p.paidAt)
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      const row = series.find((s) => s.month === k)
      if (row) row.income += p.amount
    }

    // pending payments / overdue installments
    const overdueInstallments = await db.installment.findMany({
      where: { status: { in: ['OVERDUE', 'PENDING'] }, dueDate: { lt: new Date() }, ...(branchId ? { enrollment: { classGroup: { branchId } } } : {}) },
      include: { enrollment: { select: { student: { select: { name: true } }, classGroup: { select: { name: true } } } } },
      take: 10,
    })

    return ok({
      role: user.role,
      stats: {
        students,
        teachers,
        activeClasses,
        enrollments,
        income: payments._sum.amount || 0,
        expenses: expenses._sum.amount || 0,
        paymentsCount: payments._count,
        liveCount: liveSessions.length,
      },
      series,
      upcomingSessions: sessions,
      liveSessions,
      overdueInstallments,
      announcements,
    })
  }

  if (user.role === 'TEACHER') {
    const [classes, sessions, students, submissions, recordings, payrolls] = await Promise.all([
      db.classGroup.findMany({ where: { teacherId: user.id }, include: { course: { select: { title: true } }, _count: { select: { enrollments: true, sessions: true } } } }),
      db.session.findMany({
        where: { classGroup: { teacherId: user.id }, status: { in: ['SCHEDULED', 'LIVE'] }, date: { gte: new Date(Date.now() - 86400000) } },
        include: { classGroup: { select: { name: true, course: { select: { title: true } } } } },
        orderBy: { date: 'asc' }, take: 8,
      }),
      db.enrollment.count({ where: { classGroup: { teacherId: user.id }, status: 'ACTIVE' } }),
      db.submission.count({ where: { assignment: { classGroup: { teacherId: user.id } }, status: 'SUBMITTED' } }),
      db.recording.count({ where: { session: { classGroup: { teacherId: user.id } } } }),
      db.payroll.findMany({ where: { teacherId: user.id }, orderBy: { month: 'desc' }, take: 6 }),
    ])
    const liveSessions = await db.session.findMany({
      where: { status: 'LIVE', classGroup: { teacherId: user.id } },
      include: { classGroup: { select: { name: true } } },
    })
    return ok({
      role: 'TEACHER',
      stats: { classes: classes.length, students, pendingSubmissions: submissions, recordings, liveCount: liveSessions.length },
      myClasses: classes,
      upcomingSessions: sessions,
      liveSessions,
      payrolls,
    })
  }

  // STUDENT
  const [enrollments, payments, upcoming, assignments, quizzes, certificates, installments] = await Promise.all([
    db.enrollment.findMany({
      where: { studentId: user.id },
      include: {
        classGroup: { include: { course: { select: { title: true, coverColor: true } }, teacher: { select: { name: true } }, sessions: { where: { status: 'LIVE' } } } },
        payments: { select: { amount: true, status: true } },
        installments: { select: { amount: true, status: true, dueDate: true } },
      },
    }),
    db.payment.findMany({ where: { studentId: user.id }, orderBy: { paidAt: 'desc' }, take: 5 }),
    db.session.findMany({
      where: { classGroup: { enrollments: { some: { studentId: user.id } } }, date: { gte: new Date() }, status: { in: ['SCHEDULED', 'LIVE'] } },
      include: { classGroup: { select: { name: true, course: { select: { title: true } }, teacher: { select: { name: true } } } } },
      orderBy: { date: 'asc' }, take: 6,
    }),
    db.assignment.findMany({
      where: { classGroup: { enrollments: { some: { studentId: user.id } } } },
      include: { classGroup: { select: { name: true, course: { select: { title: true } } } }, submissions: { where: { studentId: user.id } } },
      orderBy: { createdAt: 'desc' }, take: 6,
    }),
    db.quiz.findMany({
      where: { classGroup: { enrollments: { some: { studentId: user.id } } }, isActive: true },
      include: { classGroup: { select: { name: true, course: { select: { title: true } } } }, attempts: { where: { studentId: user.id } }, _count: { select: { questions: true } } },
      take: 5,
    }),
    db.certificate.findMany({ where: { studentId: user.id }, include: { course: { select: { title: true } } } }),
    db.installment.findMany({ where: { enrollment: { studentId: user.id }, status: { in: ['PENDING', 'OVERDUE'] } }, orderBy: { dueDate: 'asc' } }),
  ])

  const liveSessions = enrollments.flatMap((e) => e.classGroup.sessions.map((s) => ({ ...s, classGroup: { name: e.classGroup.name } })))
  const totalTuition = enrollments.reduce((sum, e) => sum + e.classGroup.course.price - e.discount, 0)
  const totalPaid = enrollments.reduce((sum, e) => sum + e.payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0), 0)

  return ok({
    role: 'STUDENT',
    stats: {
      courses: enrollments.length,
      certificates: certificates.length,
      debt: Math.max(totalTuition - totalPaid, 0),
      pendingAssignments: assignments.filter((a) => a.submissions.length === 0).length,
      liveCount: liveSessions.length,
    },
    enrollments,
    upcomingSessions: upcoming,
    liveSessions,
    recentPayments: payments,
    assignments,
    quizzes,
    certificates,
    installments,
  })
}
