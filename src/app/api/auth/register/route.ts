import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, setAuthCookie } from '@/lib/auth'
import { fail, logAudit } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, phone, email, password, nationalId } = body || {}

    if (!name || !password || (!phone && !email)) {
      return fail('نام، رمز عبور و شماره تماس یا ایمیل الزامی است')
    }
    if (String(password).length < 6) {
      return fail('رمز عبور باید حداقل ۶ کاراکتر باشد')
    }

    if (phone) {
      const dup = await db.user.findFirst({ where: { phone: String(phone) } })
      if (dup) return fail('این شماره تماس قبلاً ثبت شده است')
    }
    if (email) {
      const dup = await db.user.findFirst({ where: { email: String(email).toLowerCase() } })
      if (dup) return fail('این ایمیل قبلاً ثبت شده است')
    }

    const count = await db.studentProfile.count()
    const studentCode = 'STU-' + String(1000 + count + 1)

    const user = await db.user.create({
      data: {
        name: String(name).trim(),
        email: email ? String(email).toLowerCase() : null,
        phone: phone ? String(phone).trim() : null,
        nationalId: nationalId ? String(nationalId).trim() : null,
        password: hashPassword(String(password)),
        role: 'STUDENT',
        studentProfile: {
          create: { studentCode },
        },
      },
      include: { studentProfile: true, branch: true },
    })

    await logAudit(user.id, 'REGISTER', 'User', user.id, 'ثبت‌نام دانشجوی جدید')
    const res = NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role, phone: user.phone },
    })
    return setAuthCookie(res, user.id, user.role, user.branchId)
  } catch (e) {
    console.error('register error', e)
    return fail('خطا در ثبت‌نام، لطفاً دوباره تلاش کنید', 500)
  }
}
