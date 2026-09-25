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

---
Task ID: 1-7 (all implementation)
Agent: main (Super Z)
Task: Build complete educational institute platform (schema, APIs, live service, UI, seed)

Work Log:
- Pushed 23-model Prisma schema (SQLite); fixed relation issues (UserBranch, BranchManager unique, Certificate student relation)
- Built custom auth: scrypt hashing + HMAC-signed httpOnly cookie, /api/auth/{register,login,logout,me}
- Built 30+ REST endpoints: users, branches, rooms, courses, classes (auto session generation), sessions, attendance, recordings, enrollments (auto installments), payments, installments (auto-overdue), expenses, payroll (auto-calc hours×rate), finance/summary, assignments, submissions, quizzes, quiz-attempts (auto-grade), certificates (+public verify), announcements, notifications, tickets, live-messages, dashboard (role-aware), settings, audit, landing
- Live service (mini-services/live-service, port 3003): rooms per session, chat broadcast + persistence, participants, hand-raise, synced whiteboard with stroke replay, teacher live-status
- Frontend: Persian RTL (Vazirmatn), landing page with live stats, auth with 5 demo quick-logins, role-based dashboard shell, admin (overview/users/structure/classes/enrollments/finance/comms/settings), teacher (overview/classes/sessions+attendance/assignments+quizzes/recordings/live/salary), student (overview/courses/schedule/live/assignments+quizzes/payments/certificates/support), live classroom overlay
- Seed: 2 branches, 4 rooms, 5 courses, 5 classes, 61 sessions + 1 LIVE, 8 students, 3 teachers, 11 enrollments, 16 payments (balanced books: income 83.6M, expense 69.8M, profit +13.8M, debt 20M), 4 installments (2 overdue), expenses, 5 payrolls, attendance, recordings, assignment+submissions, quiz+attempt, announcements, ticket, live chat history

Stage Summary:
- Fixes during browser verification: ui-bits.tsx recreated, ListQuiz→FileQuestion alias, TabsContent/Button imports, chat Invalid Date (createdAt→at mapping), dashboard API missing course select, Question orderBy createdAt→id, Certificate student relation added, prisma query logging off, zustand persist for view/activeMenu, whiteboard stroke replay on board open
- VERIFIED via agent-browser (dual sessions through Caddy :81): login flows (all roles), admin KPIs/charts/finance, class detail+sessions+attendance UI, student dashboard, live classroom: SOCKET CONNECTED via XTransformPort=3003, cross-user chat sync (student→teacher), participants (2), hand-raise, whiteboard stroke sync, quiz auto-grade API, payment create, certificate auto-issue + public verify (valid/fake)
- Lint: 0 errors. GitHub: pushed to https://github.com/nexuzrnhhgffy/academy-platform (main)
- Demo accounts: admin/manager/teacher/student/staff @academy.ir / 123456
