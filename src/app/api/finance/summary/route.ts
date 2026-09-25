import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, branchScope } from '@/lib/api-utils'

// GET /api/finance/summary — comprehensive accounting report
export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!['ADMIN', 'MANAGER'].includes(user.role)) return fail('دسترسی غیرمجاز', 403)

  const branchId = req.nextUrl.searchParams.get('branchId') || branchScope(user)
  const payWhere = branchId ? { branchId, status: 'PAID' } : { status: 'PAID' }
  const expWhere = branchId ? { branchId } : {}

  const [payments, expenses, payrolls, enrollments] = await Promise.all([
    db.payment.findMany({ where: payWhere, include: { enrollment: { include: { classGroup: { include: { course: { select: { title: true } } } } } }, student: { select: { name: true } } } }),
    db.expense.findMany({ where: expWhere }),
    db.payroll.findMany({ where: { status: 'PAID' } }),
    db.enrollment.findMany({
      where: branchId ? { classGroup: { branchId } } : {},
      include: {
        student: { select: { id: true, name: true, phone: true } },
        classGroup: { select: { name: true, course: { select: { title: true, price: true } } } },
        payments: { select: { amount: true, status: true } },
        installments: { select: { amount: true, status: true, dueDate: true } },
      },
    }),
  ])

  const totalIncome = payments.reduce((s, p) => s + p.amount, 0)
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0) + payrolls.reduce((s, p) => s + p.total, 0)

  // monthly series — last 12 months
  const now = new Date()
  const series: { month: string; income: number; expense: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    series.push({ month: key, income: 0, expense: 0 })
  }
  const keyOf = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
  for (const p of payments) {
    const k = keyOf(new Date(p.paidAt))
    const row = series.find((s) => s.month === k)
    if (row) row.income += p.amount
  }
  for (const e of expenses) {
    const k = keyOf(new Date(e.date))
    const row = series.find((s) => s.month === k)
    if (row) row.expense += e.amount
  }
  for (const p of payrolls) {
    const row = series.find((s) => s.month === p.month)
    if (row) row.expense += p.total
  }

  // revenue by course
  const byCourse: Record<string, number> = {}
  for (const p of payments) {
    const title = p.enrollment?.classGroup?.course?.title || 'سایر'
    byCourse[title] = (byCourse[title] || 0) + p.amount
  }

  // income by method
  const byMethod: Record<string, number> = {}
  for (const p of payments) byMethod[p.method] = (byMethod[p.method] || 0) + p.amount

  // debtors — students who paid less than tuition
  const debtors = enrollments
    .map((e) => {
      const tuition = Math.max(e.classGroup.course.price - e.discount, 0)
      const paid = e.payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0)
      const overdue = e.installments.filter((i) => i.status === 'OVERDUE').reduce((s, i) => s + i.amount, 0)
      return {
        studentId: e.student.id,
        studentName: e.student.name,
        phone: e.student.phone,
        className: e.classGroup.name,
        courseTitle: e.classGroup.course.title,
        tuition,
        paid,
        debt: Math.max(tuition - paid, 0),
        overdue,
      }
    })
    .filter((d) => d.debt > 0)
    .sort((a, b) => b.debt - a.debt)
    .slice(0, 50)

  const totalDebt = debtors.reduce((s, d) => s + d.debt, 0)

  return ok({
    totals: {
      income: totalIncome,
      expense: totalExpense,
      profit: totalIncome - totalExpense,
      debt: totalDebt,
      paymentsCount: payments.length,
      enrollmentsCount: enrollments.length,
    },
    series,
    byCourse,
    byMethod,
    debtors,
    recentPayments: payments.slice(-10).reverse(),
  })
}
