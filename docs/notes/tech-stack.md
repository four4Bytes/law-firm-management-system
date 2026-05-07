# Tech Stack

## Frontend

- React + TypeScript → strongly typed, modern UI framework.
- CSS Modules → scoped styling, avoids conflicts, easy to maintain.
- UI Library:
  - React Aria

---

## Backend

- Next.js (App Router) with TypeScript → server‑side rendering, API routes, and seamless integration with React frontend.
- Prisma ORM + PostgreSQL → type‑safe database access, relational data (cases, clients, payments, tasks).
- RBAC Middleware → enforce role‑based access at API level.
- File Storage:
  - AWS S3 or Wasabi for cloud storage.
  - Or local storage with mounted volumes if strictly on‑premise.

---

## Authentication & Security

- NextAuth.js → supports Google Auth, email/password, and custom providers.
- JWT or Session‑based auth depending on deployment.
- Audit logs → track who viewed/edited cases and documents.
- Encryption → TLS for data in transit, AES for sensitive data at rest.

---

## Notifications

- Resend (Email) → transactional emails.
- Twilio (SMS) → reminders for deadlines.
- Node‑Cron → scheduled jobs (e.g., 3‑day deadline reminders).

---

## Deployment

- VPS (Ubuntu + Docker) → containerized deployment, easy to replicate.
- On‑Premise Server → same Docker setup, with mounted storage for documents.
- Reverse Proxy: Nginx or Traefik for SSL termination and routing.
- Monitoring: Prometheus + Grafana for server health and usage.

---

## Why This Stack Fits Your Needs

- TypeScript everywhere → type safety across frontend, backend, and database.
- React + Next.js → unified framework, good for multi‑branch dashboards.
- Prisma + PostgreSQL → relational structure matches your case/task/payment hierarchy.
- Dockerized deployment → portable between VPS and on‑premise.
- Secure storage options → flexible between cloud and private servers.
