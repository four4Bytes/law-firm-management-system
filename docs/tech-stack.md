## My recommended stack for a capstone

### Frontend

**React + Vite** or **Next.js**

- React is common, flexible, and easy to find help for.
- Vite makes setup fast and simple.
- Next.js is better if you want routing, API support, and a more “production-like” structure.

**Why:**
You need a dashboard-style interface with many screens: clients, cases, tasks, deadlines, payments, documents, users, and reports. React handles this well.

### Backend

**Node.js + Express**
or
**NestJS** if you want a more structured backend

**Why:**
Node.js is good for building APIs quickly. Express is simpler for capstone work. NestJS is cleaner for larger systems because it enforces structure, but it is more complex.

For your project, if your team is still learning, **Express is the easier choice**. If you want stronger architecture, **NestJS is better**.

### Database

**PostgreSQL**

**Why:**
This system has relational data:

- users
- branches
- clients
- cases
- tasks
- deadlines
- payments
- documents
- notes

That is exactly what relational databases are good at. PostgreSQL is reliable, widely used, and works well with role-based systems.

### ORM

**Prisma** or **TypeORM**

**Why:**
An ORM makes database work easier and safer.
For most student teams, **Prisma** is the better choice because it is simpler, more readable, and easier to maintain.

### Authentication

**JWT-based authentication** with role-based access control

**Why:**
You need different access for super admin, admin, lawyer, paralegal, and possibly branch manager. JWT is a common way to handle login sessions in web apps.

### File storage

For a capstone:

- **local file storage** during development
- optionally **cloud storage** later, such as AWS S3 or Cloudinary

**Why:**
The system needs document upload. If you store files directly in the database, it becomes inefficient. It is better to store file metadata in the database and the actual file separately.

### Notification system

**Email notifications** first, then optional SMS

**Why:**
The interview mentioned reminders for deadlines. Email is easier to implement than SMS. SMS can be added later if needed.

### Deployment

- **Frontend:** Vercel or Netlify
- **Backend:** Render, Railway, or a VPS
- **Database:** Supabase, Railway PostgreSQL, Neon, or managed PostgreSQL

**Why:**
These are easier for capstone deployment than running your own server from scratch.

---

## Best practical stack recommendation

If you want the most balanced option, I would recommend:

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** JWT + role-based access control
- **File uploads:** local storage during development, cloud storage later
- **Notifications:** email
- **Deployment:** Vercel + Render + PostgreSQL host

This is probably the best stack if your goal is to finish on time and still make it look professional.

---

## Alternative stack if you want a more “complete” modern setup

- **Frontend:** Next.js
- **Backend:** NestJS
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** JWT or session-based auth
- **Storage:** AWS S3
- **Notifications:** email + SMS
- **Deployment:** Docker + VPS or cloud hosting

**Why choose this:**
This is more scalable and more professional, but it is heavier and harder for a capstone team unless you already know the tools.

---

## If you want the easiest stack

If your team wants simplicity above all:

- **Frontend:** React
- **Backend:** Express
- **Database:** MySQL or PostgreSQL
- **Auth:** JWT
- **Storage:** local uploads
- **Deployment:** shared hosting or simple cloud deploy

This is easier to learn, but PostgreSQL is still the better database choice for this kind of system.

---

## What I would not recommend

I would avoid:

- building this as a **mobile-only app**
- storing everything in **Excel/CSV**
- using **MongoDB** unless your team really prefers NoSQL
- making file uploads the main storage without proper metadata
- using a very complex microservices architecture

Those choices would make the project harder without giving you much benefit.

---

## My honest recommendation

For your project, the best balance is:

**React + Vite + Express + PostgreSQL + Prisma + JWT + Email notifications**

That stack is:

- realistic for a capstone
- strong enough for role-based workflows
- easy to explain in defense
- common enough that your team can find support and tutorials
