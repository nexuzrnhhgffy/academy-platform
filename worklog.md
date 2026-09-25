# Project Worklog — پلتفرم جامع مؤسسه آموزشی (ACAA Academy Platform)

> Shared multi-agent work log. APPEND ONLY. Each agent MUST read this file before working and append its section after finishing.

---

Task ID: 0
Agent: main (Super Z)
Task: Initial planning & environment setup for complete educational institute platform

Work Log:
- Loaded fullstack-dev skill, initialized Next.js 16 project environment
- User pattern file (download/README.md) was empty — building from scratch with improved architecture
- Defined full feature scope and database design (see Stage Summary)

Stage Summary:
- PROJECT: "آکادمی جامع" (Comprehensive Academy) — Persian RTL educational institute management platform
- TECH: Next.js 16 App Router + TypeScript + Tailwind 4 + shadcn/ui + Prisma/SQLite + NextAuth v4 + socket.io mini-service (port 3003) for live classes
- CORE MODULES PLANNED:
  1. Auth & RBAC: ADMIN, MANAGER (مدیر شعبه), TEACHER (مدرس), STUDENT (دانشجو), STAFF/RECEPTION (پذیرش) — NextAuth credentials + bcrypt, session via JWT
  2. Branch management (شعب): multi-branch support with manager per branch
  3. Course/Class management (دوره‌ها و کلاس‌ها): courses → class groups → sessions with schedule (day/time/room)
  4. Live classroom (جلسه لایو): socket.io real-time — live chat, raise hand, participants, live status; class recording entries (ضبط جلسات) with video player
  5. Enrollment & registration (ثبت‌نام): student registration, enrollment with payment tracking
  6. Payments & Accounting (مالی و حسابداری): payments (online/pos/cash), tuition installments, expenses, teacher salaries/payroll, transactions ledger, financial reports (income/expense/profit), student debt tracking
  7. Attendance (حضور و غیاب): per-session attendance marking
  8. Assignments & Exams: homework/assignments + submissions with grading; quizzes with auto-grading
  9. Certificates (گواهینامه): auto issuance on course completion with verification code
  10. Communication: announcements (اطلاعیه), notifications (real-time via socket), support tickets, internal messaging
  11. Teacher management: profiles, specialties, hourly rates, salary calculation, evaluations
  12. Dashboards: admin (KPIs, charts, revenue), manager (branch scope), teacher (classes, students, schedule), student (courses, payments, schedule)
  13. Reports & Audit: comprehensive reports page, audit log
  14. Settings: institute info, terms, RTL Persian UI everywhere
- DB: prisma/schema.prisma (SQLite, db file in /home/z/my-project/db)
- SINGLE-ROUTE RULE: everything under src/app/page.tsx with client-side view routing (no other routes allowed by platform)
- NEXT STEPS: Task 1 schema+auth, Task 2 core CRUD APIs, Task 3 UI shells+dashboards, Task 4 live class socket service, Task 5 finance module, Task 6 polish+verify, Task 7 GitHub push
