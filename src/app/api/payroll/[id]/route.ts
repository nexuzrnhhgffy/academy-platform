import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, requireUser, STAFF_ROLES, logAudit } from '@/lib/api-utils'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const { id } = await params
  const b = await req.json()
  const data: Record<string, unknown> = {}
  if (b.bonus !== undefined) data.bonus = Number(b.bonus)
  if (b.deduction !== undefined) data.deduction = Number(b.deduction)
  if (b.status === 'PAID') {
    data.status = 'PAID'
    data.paidAt = new Date()
  }

  const current = await db.payroll.findUnique({ where: { id } })
  if (!current) return fail('فیش یافت نشد', 404)

  const bonus = data.bonus !== undefined ? (data.bonus as number) : current.bonus
  const deduction = data.deduction !== undefined ? (data.deduction as number) : current.deduction
  data.total = Math.max(current.baseAmount + bonus - deduction, 0)

  const payroll = await db.payroll.update({ where: { id }, data })
  if (b.status === 'PAID') {
    await notify(payroll.teacherId, 'حقوق پرداخت شد', `فیش حقوقی ماه ${payroll.month} پرداخت شد`, 'SUCCESS')
    // also register as expense
    await db.expense.create({
      data: {
        title: `حقوق مدرس — ${payroll.month}`,
        category: 'SALARY',
        amount: payroll.total,
        date: new Date(),
        createdById: user.id,
      },
    })
  }
  await logAudit(user.id, 'UPDATE', 'Payroll', id, `به‌روزرسانی فیش حقوقی`)
  return ok({ payroll })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return fail('احراز هویت لازم است', 401)
  if (!STAFF_ROLES.includes(user.role)) return fail('دسترسی غیرمجاز', 403)
  const { id } = await params
  await db.payroll.delete({ where: { id } })
  return ok({ ok: true })
}
