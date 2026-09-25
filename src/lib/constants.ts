// Persian labels & color maps shared across the app

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'مدیر سیستم',
  MANAGER: 'مدیر شعبه',
  TEACHER: 'مدرس',
  STUDENT: 'دانشجو',
  STAFF: 'کارمند پذیرش',
}

export const CLASS_STATUS: Record<string, { label: string; color: string }> = {
  PLANNED: { label: 'در انتظار شروع', color: 'bg-amber-100 text-amber-700' },
  ACTIVE: { label: 'فعال', color: 'bg-emerald-100 text-emerald-700' },
  COMPLETED: { label: 'پایان‌یافته', color: 'bg-slate-100 text-slate-600' },
  CANCELLED: { label: 'لغو شده', color: 'bg-rose-100 text-rose-600' },
}

export const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: 'برنامه‌ریزی‌شده', color: 'bg-sky-100 text-sky-700' },
  LIVE: { label: 'در حال برگزاری', color: 'bg-rose-100 text-rose-600' },
  COMPLETED: { label: 'برگزار شده', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'لغو شده', color: 'bg-slate-100 text-slate-500' },
}

export const ENROLL_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'فعال', color: 'bg-emerald-100 text-emerald-700' },
  COMPLETED: { label: 'پایان‌یافته', color: 'bg-indigo-100 text-indigo-600' },
  SUSPENDED: { label: 'معلق', color: 'bg-amber-100 text-amber-700' },
  CANCELLED: { label: 'لغو شده', color: 'bg-rose-100 text-rose-600' },
}

export const PAY_METHODS: Record<string, string> = {
  CASH: 'نقدی',
  CARD: 'کارتخوان',
  ONLINE: 'پرداخت آنلاین',
  TRANSFER: 'کارت به کارت',
}

export const PAY_STATUS: Record<string, { label: string; color: string }> = {
  PAID: { label: 'پرداخت‌شده', color: 'bg-emerald-100 text-emerald-700' },
  PENDING: { label: 'در انتظار', color: 'bg-amber-100 text-amber-700' },
  FAILED: { label: 'ناموفق', color: 'bg-rose-100 text-rose-600' },
  REFUNDED: { label: 'بازگشتی', color: 'bg-slate-100 text-slate-500' },
}

export const EXPENSE_CATEGORIES: Record<string, string> = {
  RENT: 'اجاره',
  SALARY: 'حقوق و دستمزد',
  UTILITIES: 'قبض و انرژی',
  MARKETING: 'تبلیغات',
  SUPPLIES: 'لوازم و تجهیزات',
  OTHER: 'سایر',
}

export const ATTENDANCE_STATUS: Record<string, { label: string; color: string }> = {
  PRESENT: { label: 'حاضر', color: 'bg-emerald-100 text-emerald-700' },
  ABSENT: { label: 'غایب', color: 'bg-rose-100 text-rose-600' },
  LATE: { label: 'تأخیر', color: 'bg-amber-100 text-amber-700' },
  EXCUSED: { label: 'غیبت موجه', color: 'bg-sky-100 text-sky-700' },
}

export const INSTALLMENT_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'پرداخت‌نشده', color: 'bg-amber-100 text-amber-700' },
  PAID: { label: 'پرداخت‌شده', color: 'bg-emerald-100 text-emerald-700' },
  OVERDUE: { label: 'معوق', color: 'bg-rose-100 text-rose-600' },
}

export const TICKET_STATUS: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'باز', color: 'bg-amber-100 text-amber-700' },
  IN_PROGRESS: { label: 'در حال بررسی', color: 'bg-sky-100 text-sky-700' },
  CLOSED: { label: 'بسته‌شده', color: 'bg-emerald-100 text-emerald-700' },
}

export const PRIORITY: Record<string, { label: string; color: string }> = {
  LOW: { label: 'کم', color: 'bg-slate-100 text-slate-500' },
  MEDIUM: { label: 'متوسط', color: 'bg-amber-100 text-amber-700' },
  HIGH: { label: 'فوری', color: 'bg-rose-100 text-rose-600' },
}

export const TICKET_CATEGORIES: Record<string, string> = {
  GENERAL: 'عمومی',
  FINANCE: 'مالی',
  EDUCATIONAL: 'آموزشی',
  TECHNICAL: 'فنی',
}

export const AUDIENCES: Record<string, string> = {
  ALL: 'همه',
  STUDENTS: 'دانشجویان',
  TEACHERS: 'اساتید',
  STAFF: 'کارکنان',
}

export const COURSE_LEVELS = ['مقدماتی', 'متوسط', 'پیشرفته']
export const COURSE_CATEGORIES = ['برنامه‌نویسی', 'زبان‌های خارجی', 'هنر و طراحی', 'مدیریت و کسب‌وکار', 'کنکور', 'مهارت‌های نرم']
export const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']

export const COVER_COLORS = ['emerald', 'teal', 'cyan', 'amber', 'rose', 'violet', 'slate']
