// Seed script — realistic Persian demo data for the academy platform
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  console.log('🌱 Seeding database...')

  // wipe (order matters)
  await db.auditLog.deleteMany()
  await db.liveMessage.deleteMany()
  await db.ticketMessage.deleteMany()
  await db.ticket.deleteMany()
  await db.notification.deleteMany()
  await db.announcement.deleteMany()
  await db.certificate.deleteMany()
  await db.quizAttempt.deleteMany()
  await db.question.deleteMany()
  await db.quiz.deleteMany()
  await db.submission.deleteMany()
  await db.assignment.deleteMany()
  await db.installment.deleteMany()
  await db.payment.deleteMany()
  await db.expense.deleteMany()
  await db.payroll.deleteMany()
  await db.attendance.deleteMany()
  await db.recording.deleteMany()
  await db.session.deleteMany()
  await db.enrollment.deleteMany()
  await db.classGroup.deleteMany()
  await db.course.deleteMany()
  await db.room.deleteMany()
  await db.branch.deleteMany()
  await db.teacherProfile.deleteMany()
  await db.studentProfile.deleteMany()
  await db.user.deleteMany()
  await db.setting.deleteMany()

  // ===== Settings =====
  await db.setting.createMany({
    data: [
      { key: 'instituteName', value: 'آکادمی نخبگان' },
      { key: 'instituteSlogan', value: 'مسیر رشد شما از اینجا شروع می‌شود' },
      { key: 'phone', value: '۰۲۱-۹۱۰۰۲۰۳۰' },
      { key: 'address', value: 'تهران، خیابان ولیعصر، برج آموزش، طبقه ۵' },
      { key: 'workHours', value: 'همه‌روزه ۸ صبح تا ۹ شب' },
    ],
  })

  // ===== Branches =====
  const bCentral = await db.branch.create({ data: { name: 'شعبه مرکزی — ولیعصر', code: 'BR-VALI', address: 'تهران، خیابان ولیعصر، برج آموزش، طبقه ۵', phone: '۰۲۱-۹۱۰۰۲۰۳۰' } })
  const bNorth = await db.branch.create({ data: { name: 'شعبه شمال — اندرزگو', code: 'BR-NORTH', address: 'تهران، بلوار اندرزگو، پلاک ۸۲', phone: '۰۲۱-۲۲۳۳۴۴۵۵' } })

  // ===== Rooms =====
  const r101 = await db.room.create({ data: { name: 'کلاس ۱۰۱', capacity: 24, branchId: bCentral.id } })
  const r102 = await db.room.create({ data: { name: 'کلاس ۱۰۲', capacity: 18, branchId: bCentral.id } })
  const rLab = await db.room.create({ data: { name: 'آزمایشگاه کامپیوتر', capacity: 20, branchId: bCentral.id } })
  const r201 = await db.room.create({ data: { name: 'کلاس ۲۰۱', capacity: 16, branchId: bNorth.id } })

  // ===== Users =====
  const pw = hashPassword('123456')
  const admin = await db.user.create({
    data: { name: 'مدیر سیستم', email: 'admin@academy.ir', phone: '09120000001', password: pw, role: 'ADMIN' },
  })

  const manager = await db.user.create({
    data: { name: 'سارا کاظمی', email: 'manager@academy.ir', phone: '09120000002', password: pw, role: 'MANAGER', branchId: bCentral.id },
  })
  await db.branch.update({ where: { id: bCentral.id }, data: { managerId: manager.id } })

  const manager2 = await db.user.create({
    data: { name: 'حمید رستمی', email: 'manager2@academy.ir', phone: '09120000003', password: pw, role: 'MANAGER', branchId: bNorth.id },
  })
  await db.branch.update({ where: { id: bNorth.id }, data: { managerId: manager2.id } })

  const t1 = await db.user.create({
    data: { name: 'رضا محمدی', email: 'teacher@academy.ir', phone: '09120000004', password: pw, role: 'TEACHER', branchId: bCentral.id, bio: 'مهندس نرم‌افزار و مدرس ۱۰ ساله برنامه‌نویسی' },
  })
  await db.teacherProfile.create({ data: { userId: t1.id, specialty: 'برنامه‌نویسی و وب', education: 'کارشناسی ارشد نرم‌افزار', hourlyRate: 350000, hireDate: new Date('2021-06-01'), rating: 4.9 } })

  const t2 = await db.user.create({
    data: { name: 'مریم احمدی', email: 'teacher2@academy.ir', phone: '09120000005', password: pw, role: 'TEACHER', branchId: bCentral.id, bio: 'مدرس زبان انگلیسی، دارنده مدرک IELTS 8.5' },
  })
  await db.teacherProfile.create({ data: { userId: t2.id, specialty: 'زبان انگلیسی', education: 'کارشناسی ادبیات انگلیسی', hourlyRate: 300000, hireDate: new Date('2020-03-15'), rating: 4.8 } })

  const t3 = await db.user.create({
    data: { name: 'علی نوروزی', email: 'teacher3@academy.ir', phone: '09120000006', password: pw, role: 'TEACHER', branchId: bNorth.id, bio: 'مدرس ریاضیات و مشاور کنکور' },
  })
  await db.teacherProfile.create({ data: { userId: t3.id, specialty: 'ریاضیات', education: 'دکترای ریاضی کاربردی', hourlyRate: 380000, hireDate: new Date('2019-09-01'), rating: 4.7 } })

  const staff = await db.user.create({
    data: { name: 'فاطمه حسینی', email: 'staff@academy.ir', phone: '09120000007', password: pw, role: 'STAFF', branchId: bCentral.id },
  })

  const studentNames = [
    ['علی رضایی', 'student@academy.ir', '09130000001'],
    ['زهرا موسوی', 'student2@academy.ir', '09130000002'],
    ['محمد کریمی', 'student3@academy.ir', '09130000003'],
    ['نگار شریفی', 'student4@academy.ir', '09130000004'],
    ['امیر جعفری', 'student5@academy.ir', '09130000005'],
    ['سارا عبدی', 'student6@academy.ir', '09130000006'],
    ['حسین قاسمی', 'student7@academy.ir', '09130000007'],
    ['ریحانه ملکی', 'student8@academy.ir', '09130000008'],
  ]
  const students = []
  for (let i = 0; i < studentNames.length; i++) {
    const [name, email, phone] = studentNames[i]
    const s = await db.user.create({
      data: {
        name, email, phone, password: pw, role: 'STUDENT',
        branchId: i < 6 ? bCentral.id : bNorth.id,
        studentProfile: { create: { studentCode: `STU-${1001 + i}`, educationLevel: 'دبیرستان' } },
      },
    })
    students.push(s)
  }

  // ===== Courses =====
  const cPython = await db.course.create({ data: { title: 'برنامه‌نویسی پایتون از صفر', description: 'آموزش جامع پایتون از مبانی تا شی‌گرایی و پروژه‌های واقعی', category: 'برنامه‌نویسی', level: 'مقدماتی', price: 8500000, durationHours: 48, sessionsCount: 24, coverColor: 'emerald', branchId: null } })
  const cWeb = await db.course.create({ data: { title: 'طراحی وب مدرن (HTML/CSS/JS)', description: 'ساخت وب‌سایت‌های واکنش‌گرا با استانداردهای روز دنیا', category: 'برنامه‌نویسی', level: 'متوسط', price: 9800000, durationHours: 54, sessionsCount: 27, coverColor: 'cyan', branchId: null } })
  const cEnglish = await db.course.create({ data: { title: 'مکالمه انگلیسی — سطح متوسط', description: 'تقویت مهارت مکالمه با روش تدریس تعاملی و کلاس‌های لایو', category: 'زبان‌های خارجی', level: 'متوسط', price: 6500000, durationHours: 40, sessionsCount: 20, coverColor: 'violet', branchId: null } })
  const cKonkur = await db.course.create({ data: { title: 'ریاضیات جامع کنکور', description: 'مرور کامل مباحث ریاضی کنکور با تست‌های زمان‌دار هفتگی', category: 'کنکور', level: 'پیشرفته', price: 12500000, durationHours: 72, sessionsCount: 36, coverColor: 'amber', branchId: null } })
  const cMarketing = await db.course.create({ data: { title: 'دیجیتال مارکتینگ حرفه‌ای', description: 'از سئو تا کمپین‌سازی در شبکه‌های اجتماعی', category: 'مدیریت و کسب‌وکار', level: 'مقدماتی', price: 7500000, durationHours: 36, sessionsCount: 18, coverColor: 'rose', branchId: null } })

  // ===== Classes =====
  const cls1 = await db.classGroup.create({
    data: { name: 'پایتون — گروه A', courseId: cPython.id, teacherId: t1.id, branchId: bCentral.id, roomId: rLab.id, capacity: 20, startDate: new Date('2025-11-01'), scheduleDays: 'شنبه,سه‌شنبه', scheduleTime: '16:00 - 18:00', status: 'ACTIVE' },
  })
  const cls2 = await db.classGroup.create({
    data: { name: 'طراحی وب — گروه B', courseId: cWeb.id, teacherId: t1.id, branchId: bCentral.id, roomId: r102.id, capacity: 18, startDate: new Date('2025-12-15'), scheduleDays: 'یکشنبه,چهارشنبه', scheduleTime: '18:00 - 20:00', status: 'ACTIVE' },
  })
  const cls3 = await db.classGroup.create({
    data: { name: 'مکالمه انگلیسی — صبح', courseId: cEnglish.id, teacherId: t2.id, branchId: bCentral.id, roomId: r101.id, capacity: 14, startDate: new Date('2025-10-20'), scheduleDays: 'دوشنبه,پنجشنبه', scheduleTime: '10:00 - 12:00', status: 'ACTIVE' },
  })
  const cls4 = await db.classGroup.create({
    data: { name: 'ریاضی کنکور — ترم زمستان', courseId: cKonkur.id, teacherId: t3.id, branchId: bNorth.id, roomId: r201.id, capacity: 25, startDate: new Date('2026-01-05'), scheduleDays: 'شنبه,دوشنبه,چهارشنبه', scheduleTime: '15:00 - 17:30', status: 'ACTIVE' },
  })
  const cls5 = await db.classGroup.create({
    data: { name: 'دیجیتال مارکتینگ — گروه اول', courseId: cMarketing.id, teacherId: t1.id, branchId: bCentral.id, roomId: r101.id, capacity: 22, startDate: new Date('2026-02-01'), scheduleDays: 'جمعه', scheduleTime: '09:00 - 13:00', status: 'PLANNED' },
  })

  // ===== Sessions (past completed + upcoming) =====
  const allClasses = [
    { cls: cls1, start: new Date('2025-11-01') },
    { cls: cls2, start: new Date('2025-12-15') },
    { cls: cls3, start: new Date('2025-10-20') },
    { cls: cls4, start: new Date('2026-01-05') },
    { cls: cls5, start: new Date('2026-02-01') },
  ]
  const sessionsByClass: Record<string, string[]> = {}
  for (const { cls, start } of allClasses) {
    const ids: string[] = []
    const total = 12
    const now = new Date()
    for (let i = 0; i < total; i++) {
      const date = new Date(start)
      date.setDate(date.getDate() + i * 7)
      let status = 'SCHEDULED'
      if (date < now) status = 'COMPLETED'
      const s = await db.session.create({
        data: {
          classGroupId: cls.id,
          title: `جلسه ${i + 1}`,
          date,
          startTime: cls.scheduleTime.split(' - ')[0] || '16:00',
          endTime: cls.scheduleTime.split(' - ')[1] || '18:00',
          status,
        },
      })
      ids.push(s.id)
    }
    sessionsByClass[cls.id] = ids
  }

  // a live session right now for demo
  const liveSession = await db.session.create({
    data: { classGroupId: cls1.id, title: 'جلسه ویژه — رفع اشکال پروژه', date: new Date(), startTime: '16:00', endTime: '18:00', topic: 'بررسی پروژه پایانی و رفع اشکال', status: 'LIVE' },
  })

  // ===== Enrollments =====
  const enroll = async (studentId: string, classGroupId: string, discount = 0) => {
    return db.enrollment.create({ data: { studentId, classGroupId, discount, status: 'ACTIVE' } })
  }
  const e1 = await enroll(students[0].id, cls1.id)
  const e2 = await enroll(students[1].id, cls1.id, 500000)
  const e3 = await enroll(students[2].id, cls1.id)
  const e4 = await enroll(students[3].id, cls1.id)
  const e5 = await enroll(students[0].id, cls3.id)
  const e6 = await enroll(students[4].id, cls3.id)
  const e7 = await enroll(students[5].id, cls2.id)
  const e8 = await enroll(students[1].id, cls2.id)
  const e9 = await enroll(students[6].id, cls4.id)
  const e10 = await enroll(students[7].id, cls4.id)
  const e11 = await enroll(students[2].id, cls4.id)

  // ===== Payments (varied methods & dates) =====
  const pay = async (studentId: string, enrollmentId: string, amount: number, monthsAgo: number, method = 'CARD') => {
    const d = new Date()
    d.setMonth(d.getMonth() - monthsAgo)
    const enr = await db.enrollment.findUnique({ where: { id: enrollmentId }, include: { classGroup: true } })
    return db.payment.create({
      data: {
        studentId, enrollmentId, amount, method, status: 'PAID',
        refCode: 'PAY-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
        paidAt: d,
        branchId: enr?.classGroup.branchId || null,
      },
    })
  }
  await pay(students[0].id, e1.id, 8500000, 4, 'CARD')
  await pay(students[1].id, e2.id, 4000000, 4, 'CASH')
  await pay(students[1].id, e2.id, 4000000, 3, 'CASH')
  await pay(students[2].id, e3.id, 4500000, 4, 'ONLINE')
  await pay(students[2].id, e3.id, 2500000, 2, 'ONLINE')
  await pay(students[3].id, e4.id, 4000000, 4, 'TRANSFER')
  await pay(students[0].id, e5.id, 6500000, 3, 'ONLINE')
  await pay(students[4].id, e6.id, 3250000, 3, 'CARD')
  await pay(students[4].id, e6.id, 3250000, 2, 'CARD')
  await pay(students[5].id, e7.id, 4900000, 2, 'ONLINE')
  await pay(students[5].id, e7.id, 4900000, 1, 'ONLINE')
  await pay(students[1].id, e8.id, 9800000, 2, 'CARD')
  await pay(students[6].id, e9.id, 6250000, 1, 'TRANSFER')
  await pay(students[6].id, e9.id, 6250000, 0, 'TRANSFER')
  await pay(students[7].id, e10.id, 6000000, 1, 'CASH')
  await pay(students[2].id, e11.id, 5000000, 1, 'CARD')

  // ===== Installments =====
  await db.installment.create({ data: { enrollmentId: e3.id, amount: 1500000, dueDate: new Date(Date.now() - 10 * 86400000), status: 'OVERDUE' } })
  await db.installment.create({ data: { enrollmentId: e4.id, amount: 4500000, dueDate: new Date(Date.now() - 5 * 86400000), status: 'OVERDUE' } })
  await db.installment.create({ data: { enrollmentId: e10.id, amount: 6500000, dueDate: new Date(Date.now() + 15 * 86400000) } })
  await db.installment.create({ data: { enrollmentId: e11.id, amount: 7500000, dueDate: new Date(Date.now() + 30 * 86400000) } })

  // ===== Expenses =====
  const exp = (title: string, category: string, amount: number, branchId: string | null, monthsAgo: number) => {
    const d = new Date()
    d.setMonth(d.getMonth() - monthsAgo)
    return db.expense.create({ data: { title, category, amount, branchId, date: d, createdById: admin.id } })
  }
  await exp('اجاره ساختمان ولیعصر', 'RENT', 3500000, bCentral.id, 4)
  await exp('اجاره ساختمان اندرزگو', 'RENT', 2500000, bNorth.id, 4)
  await exp('قبوض برق و اینترنت شعبه مرکزی', 'UTILITIES', 1800000, bCentral.id, 3)
  await exp('کمپین تبلیغاتی اینستاگرام', 'MARKETING', 3000000, null, 3)
  await exp('خرید ۵ دستگاه کامپیوتر آزمایشگاه', 'SUPPLIES', 9000000, bCentral.id, 2)
  await exp('اجاره ساختمان ولیعصر', 'RENT', 3500000, bCentral.id, 2)
  await exp('لوازم‌التحریر و ملزومات کلاس', 'SUPPLIES', 900000, bCentral.id, 1)
  await exp('اجاره ساختمان ولیعصر', 'RENT', 3500000, bCentral.id, 0)
  await exp('تبلیغات بیلبورد شعبه شمال', 'MARKETING', 1500000, bNorth.id, 1)

  // ===== Payroll =====
  const mkPayroll = async (teacherId: string, month: string, hours: number, rate: number, status = 'PAID') => {
    const total = hours * rate
    return db.payroll.create({
      data: { teacherId, month, baseAmount: total, hoursCount: hours, hourlyRate: rate, bonus: 0, deduction: 0, total, status, paidAt: status === 'PAID' ? new Date(`${month}-28`) : null },
    })
  }
  await mkPayroll(t1.id, '2025-12', 32, 350000)
  await mkPayroll(t2.id, '2025-12', 28, 300000)
  await mkPayroll(t1.id, '2026-01', 36, 350000)
  await mkPayroll(t2.id, '2026-01', 28, 300000)
  await mkPayroll(t3.id, '2026-01', 40, 380000, 'PENDING')

  // ===== Attendance for past sessions of cls1 =====
  const cls1Past = sessionsByClass[cls1.id].slice(0, 6)
  for (const sid of cls1Past) {
    for (const e of [e1, e2, e3, e4]) {
      const r = Math.random()
      const status = r > 0.9 ? 'ABSENT' : r > 0.8 ? 'LATE' : 'PRESENT'
      await db.attendance.create({ data: { sessionId: sid, studentId: e.studentId, status } })
    }
  }

  // ===== Recordings =====
  await db.recording.createMany({
    data: [
      { sessionId: sessionsByClass[cls1.id][0], title: 'معرفی دوره و نصب پایتون', durationMin: 105, url: '' },
      { sessionId: sessionsByClass[cls1.id][1], title: 'متغیرها و انواع داده', durationMin: 98, url: '' },
      { sessionId: sessionsByClass[cls1.id][2], title: 'ساختارهای کنترلی', durationMin: 112, url: '' },
      { sessionId: sessionsByClass[cls3.id][0], title: 'Introductions & Small Talk', durationMin: 90, url: '' },
    ],
  })

  // ===== Assignments & Submissions =====
  const a1 = await db.assignment.create({ data: { classGroupId: cls1.id, title: 'تمرین ۱ — ماشین‌حساب پایتون', description: 'یک برنامه ماشین‌حساب ساده با چهار عمل اصلی بنویسید.', dueDate: new Date(Date.now() + 3 * 86400000), maxScore: 20 } })
  const a2 = await db.assignment.create({ data: { classGroupId: cls1.id, title: 'تمرین ۲ — مدیریت لیست دانشجویان', description: 'برنامه‌ای برای افزودن، حذف و جستجوی دانشجو با dict و list بنویسید.', dueDate: new Date(Date.now() + 10 * 86400000), maxScore: 20 } })
  await db.submission.create({ data: { assignmentId: a1.id, enrollmentId: e1.id, studentId: students[0].id, content: 'کد ماشین‌حساب من در گیت‌هاب: github.com/alir/calculator', status: 'GRADED', score: 19, feedback: 'عالی! فقط naming بهتر شود.' } })
  await db.submission.create({ data: { assignmentId: a1.id, enrollmentId: e2.id, studentId: students[1].id, content: 'پاسخ من پیوست شده است.', status: 'SUBMITTED' } })

  // ===== Quiz =====
  const q1 = await db.quiz.create({ data: { classGroupId: cls1.id, title: 'کویینک middle — متغیرها و شرط‌ها', description: '۱۰ دقیقه، ۴ سوال چهارگزینه‌ای', durationMin: 10 } })
  await db.question.createMany({
    data: [
      { quizId: q1.id, text: 'کدام‌یک نوع داده صحیح در پایتون است؟', options: JSON.stringify(['int', 'integer', 'number', 'float32']), correctIndex: 0, score: 1 },
      { quizId: q1.id, text: 'خروجی print(2 ** 3) چیست؟', options: JSON.stringify(['6', '8', '9', 'خطا می‌دهد']), correctIndex: 1, score: 1 },
      { quizId: q1.id, text: 'برای تعریف تابع از کدام کلمه استفاده می‌شود؟', options: JSON.stringify(['function', 'fun', 'def', 'lambda فقط']), correctIndex: 2, score: 1 },
      { quizId: q1.id, text: 'کدام گزینه یک tuple معتبر است؟', options: JSON.stringify(['[1,2]', '{1,2}', '(1,2)', '<1,2>']), correctIndex: 2, score: 1 },
    ],
  })
  await db.quizAttempt.create({ data: { quizId: q1.id, enrollmentId: e1.id, studentId: students[0].id, answers: '{}', score: 75, finishedAt: new Date(Date.now() - 86400000) } })

  // ===== Announcements =====
  await db.announcement.create({ data: { title: 'ثبت‌نام ترم بهار آغاز شد', content: 'عزیزان، ثبت‌نام ترم بهار با تخفیف ۱۰٪ ویژه ثبت‌نام زودهنگام آغاز شد. ظرفیت کلاس‌ها محدود است.', audience: 'ALL', isPinned: true, createdById: admin.id } })
  await db.announcement.create({ data: { title: 'برنامه آزمون‌های میان‌ترم', content: 'آزمون‌های میان‌ترم هفته سوم اسفند برگزار می‌شود. برنامه دقیق در گروه کلاس اعلام می‌گردد.', audience: 'STUDENTS', createdById: admin.id } })
  await db.announcement.create({ data: { title: 'جلسه هم‌اندیشی اساتید', content: 'جلسه هم‌اندیشی ماهانه اساتید روز پنجشنبه ساعت ۱۷ در سالن کنفرانس شعبه مرکزی برگزار می‌شود.', audience: 'TEACHERS', createdById: admin.id } })

  // ===== Notifications =====
  await db.notification.createMany({
    data: [
      { userId: students[0].id, title: 'کلاس لایو شروع شد', body: 'جلسه ویژه — رفع اشکال پروژه هم‌اکنون لایو است', type: 'LIVE' },
      { userId: students[0].id, title: 'تکلیف جدید', body: 'تمرین ۲ — مدیریت لیست دانشجویان ثبت شد', type: 'ASSIGNMENT' },
      { userId: t1.id, title: 'فیش حقوقی جدید', body: 'فیش حقوقی ماه ۱۴۰۴-۱۱ صادر شد', type: 'INFO' },
      { userId: manager.id, title: 'پرداخت جدید', body: 'پرداخت جدیدی ثبت شد', type: 'SUCCESS' },
    ],
  })

  // ===== Ticket =====
  const tk = await db.ticket.create({ data: { userId: students[1].id, subject: 'مشکل در دانلود ویدیوهای ضبط‌شده', category: 'TECHNICAL', priority: 'HIGH' } })
  await db.ticketMessage.create({ data: { ticketId: tk.id, senderId: students[1].id, content: 'سلام، ویدیو جلسه دوم برای من باز نمی‌شود.' } })
  await db.ticketMessage.create({ data: { ticketId: tk.id, senderId: staff.id, content: 'سلام وقت بخیر، در حال بررسی هستیم. لطفاً مرورگر را بروزرسانی کنید.', isStaff: true } })

  // ===== Live chat history =====
  await db.liveMessage.createMany({
    data: [
      { sessionId: liveSession.id, userId: t1.id, userName: 'رضا محمدی', role: 'TEACHER', content: 'سلام به همگی، چند دقیقه دیگر شروع می‌کنیم', type: 'CHAT' },
      { sessionId: liveSession.id, userId: students[0].id, userName: 'علی رضایی', role: 'STUDENT', content: 'سلام استاد، صدا و تصویر خوب است 🙌', type: 'CHAT' },
      { sessionId: liveSession.id, userId: students[2].id, userName: 'محمد کریمی', role: 'STUDENT', content: 'سلام، پروژه‌ام ارور می‌دهد', type: 'CHAT' },
    ],
  })

  console.log('✅ Seed complete!')
  console.log('   admin@academy.ir / 123456 (مدیر سیستم)')
  console.log('   manager@academy.ir / 123456 (مدیر شعبه)')
  console.log('   teacher@academy.ir / 123456 (مدرس)')
  console.log('   student@academy.ir / 123456 (دانشجو)')
  console.log('   staff@academy.ir / 123456 (پذیرش)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
