import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setAuthCookie, verifyPassword } from '@/lib/auth'
import { fail, logAudit } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { identifier, password } = body || {}
    if (!identifier || !password) return fail('نام کاربری و رمز عبور الزامی است')

    const id = String(identifier).trim().toLowerCase()
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: id },
          { phone: String(identifier).trim() },
          { nationalId: String(identifier).trim() },
        ],
      },
    })

    if (!user || !verifyPassword(String(password), user.password)) {
      return fail('نام کاربری یا رمز عبور اشتباه است', 401)
    }
    if (!user.isActive) return fail('حساب کاربری شما غیرفعال شده است. با پشتیبانی تماس بگیرید', 403)

    await logAudit(user.id, 'LOGIN', 'User', user.id, 'ورود به سیستم')
    const res = NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role, phone: user.phone },
    })
    return setAuthCookie(res, user.id, user.role, user.branchId)
  } catch (e) {
    console.error('login error', e)
    return fail('خطا در ورود، لطفاً دوباره تلاش کنید', 500)
  }
}
