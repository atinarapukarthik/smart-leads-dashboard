# Smart Leads Dashboard

A strictly typed, full-stack MERN application for managing sales leads with AI-powered email drafting, Gmail integration, role-based access control, analytics, and CSV export capabilities.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite 8, TailwindCSS 3, React Router 7, Axios, React Hook Form, Zod, Recharts |
| **Backend** | Node.js 18+, Express 4, TypeScript, Mongoose 8, bcryptjs, jsonwebtoken, CORS, Google Gemini AI, Gmail API |
| **Database** | MongoDB |
| **Containerization** | Docker, Docker Compose, Nginx (SPA serving) |
| **Deployment** | Vercel (frontend + backend) |

TypeScript is enforced across the entire stack with `strict: true` and `noImplicitAny: true`. Zero plain JavaScript is used for application logic.

## Project Structure

```
smart-leads-dashboard/
├── backend/
│   ├── src/
│   │   ├── models/          # Mongoose schemas (User, Lead, Message, Metric, Integration)
│   │   ├── middleware/      # Auth, RBAC, error handler
│   │   ├── controllers/     # Request handlers (auth, leads, analytics, email)
│   │   ├── routes/          # Express route definitions
│   │   ├── express.d.ts     # Express Request augmentation
│   │   └── server.ts        # Application entry point
│   ├── Dockerfile           # Multi-stage Node.js 18 Alpine build
│   ├── .env.example         # Environment variable template
│   ├── vercel.json          # Vercel deployment config
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios client + service layer (lead, email)
│   │   ├── components/      # UI components (ui, layout, leads, email)
│   │   ├── context/         # AuthContext provider
│   │   ├── hooks/           # Custom hooks (useDebounce)
│   │   ├── pages/           # Route-level components
│   │   ├── routes/          # Router + guards (ProtectedRoute, RoleRoute)
│   │   ├── types/           # Shared TypeScript interfaces
│   │   └── main.tsx         # Application entry point
│   ├── Dockerfile           # Multi-stage Vite + Nginx Alpine build
│   ├── nginx.conf           # SPA routing config
│   ├── vercel.json          # Vercel deployment config
│   └── package.json
├── docker-compose.yml       # 3-service orchestration (MongoDB, Backend, Frontend)
└── README.md
```

## Features

- **Lead Lifecycle Management**: Create, view, update, and delete leads with statuses (New, Contacted, Qualified, Lost) and sources (Website, Instagram, Referral)
- **Role-Based Access Control**: Two roles -- Admin (full CRUD including deletion) and Sales User (create, read, update only), enforced at middleware and UI levels
- **AI-Powered Email Drafting**: Generate professional introductory email drafts using Google Gemini AI (gemini-2.0-flash)
- **Gmail Integration**: Full OAuth 2.0 flow to connect a Google account, send emails directly via Gmail API, and sync inbox replies
- **AI Inbox Classification**: Automatic AI classification of inbound email replies (Qualified, Lost, Contacted) with batch processing for inbox sync
- **Analytics Dashboard**: Visual charts (pie, bar, area) for lead distribution, source breakdown, daily trends, and admin-only sales performance table with response/conversion rates
- **Debounced Search**: 500ms debounce on search input to prevent server flooding
- **Server-Side Pagination**: Database-level pagination with `.skip()` and `.limit()`
- **CSV Export**: Native Blob-based export of current page leads data
- **Form Validation**: Zod schema validation with React Hook Form
- **JWT Authentication**: Auto-attached via Axios request interceptor with 401 auto-logout on token expiry
- **Responsive UI**: Mobile cards + desktop table layout with slide-out lead detail panels

## Setup Instructions (Local)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and API keys
npm run dev
```

The server starts on `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
# Create .env with VITE_API_BASE_URL=http://localhost:5000/api
npm run dev
```

The application starts on `http://localhost:5173`.

### Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `PORT` | backend/.env | Backend server port (default: 5000) |
| `MONGO_URI` | backend/.env | MongoDB connection string |
| `JWT_SECRET` | backend/.env | Secret key for JWT signing |
| `NODE_ENV` | backend/.env | Environment mode (development/production) |
| `ADMIN_REGISTRATION_KEY` | backend/.env | Secret key required to register Admin users |
| `FRONTEND_URL` | backend/.env | CORS origin (default: http://localhost:5173) |
| `GOOGLE_CLIENT_ID` | backend/.env | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | backend/.env | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | backend/.env | OAuth callback URL |
| `GEMINI_API_KEY` | backend/.env | Google Gemini API key for AI features |
| `GEMINI_MODEL` | backend/.env | Gemini model (default: gemini-2.0-flash) |
| `VITE_API_BASE_URL` | frontend/.env | Backend API base URL |

## Setup Instructions (Docker)

Launch the entire system with a single command:

```bash
docker-compose up --build
```

This starts three services:
- **MongoDB** on port `27017`
- **Backend** on port `5000`
- **Frontend** on port `80`

Access the application at `http://localhost`.

> **Note:** When running via Docker Compose, environment variables are managed directly in `docker-compose.yml`. The `.env` files are not required for the Docker setup.

## API Documentation

### Authentication

| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| `POST` | `/api/auth/register` | No | Register a new user (Admin role requires secret key) |
| `POST` | `/api/auth/login` | No | Authenticate and receive JWT (24h expiry) |

### Leads

| Method | Endpoint | Auth Required | RBAC | Description |
|--------|----------|--------------|------|-------------|
| `POST` | `/api/leads` | Yes | Any | Create a new lead |
| `GET` | `/api/leads` | Yes | Any | List leads (paginated, filtered, sorted) |
| `GET` | `/api/leads/contacted` | Yes | Any | Get contacted/qualified/lost leads |
| `GET` | `/api/leads/:id` | Yes | Any | Get a single lead |
| `PUT` | `/api/leads/:id` | Yes | Any | Update a lead |
| `DELETE` | `/api/leads/:id` | Yes | Admin only | Delete a lead |

### Query Parameters (GET /api/leads)

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 10) |
| `search` | string | Regex search on name and email |
| `status` | string | Filter by status (New, Contacted, Qualified, Lost) |
| `source` | string | Filter by source (Website, Instagram, Referral) |
| `sort` | string | Sort order (Latest, Oldest) |

### Email & AI

| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| `POST` | `/api/email/generate-draft` | Yes | AI-generate email draft using Gemini |
| `POST` | `/api/email/send` | Yes | Send email via Gmail API |
| `POST` | `/api/email/check-inbox` | Yes | Sync Gmail inbox, batch AI classify replies |
| `GET` | `/api/email/inbound-summary` | Yes | Get reply counts per lead |
| `GET` | `/api/email/messages/:leadId` | Yes | Get message history for a lead |
| `GET` | `/api/email/google/init` | Yes | Initiate Google OAuth flow |
| `GET` | `/api/email/google/callback` | No | OAuth callback handler |
| `GET` | `/api/email/status` | Yes | Check Google integration status |
| `POST` | `/api/email/webhooks/inbound-email` | No | Webhook for inbound email processing |

### Analytics

| Method | Endpoint | Auth Required | RBAC | Description |
|--------|----------|--------------|------|-------------|
| `GET` | `/api/analytics/sales-performance` | Yes | Admin only | Full team performance metrics |

### Request/Response Examples

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@example.com","password":"adminpass123","role":"Admin"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"adminpass123"}'
```

**Create Lead (authenticated):**
```bash
curl -X POST http://localhost:5000/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{"name":"John Doe","email":"john@example.com","status":"New","source":"Website"}'
```

**List Leads (with filters):**
```bash
curl "http://localhost:5000/api/leads?page=1&limit=10&search=john&status=New&sort=Latest" \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

**Generate AI Email Draft:**
```bash
curl -X POST http://localhost:5000/api/email/generate-draft \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{"leadName":"John Doe","leadEmail":"john@example.com","companyName":"Acme Corp"}'
```

## Database Models

- **User**: name, email, password (hashed), role (Admin | Sales User)
- **Lead**: name, email, status, source, timestamps. Indexed on email, status, createdAt
- **Message**: leadId, salesUserId, direction (outbound/inbound), subject, body, aiClassification, gmailMessageId
- **Metric**: salesUserId (unique), emailsSent, repliesReceived, leadsQualified, leadsLost, lastActive
- **Integration**: userId (unique), gmailAddress, accessToken, refreshToken, expiryDate, inboxLastSync

## Default Credentials

No seed data is included. Register test users using the following curl commands:

**Admin User:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@example.com","password":"adminpass123","role":"Admin"}'
```

**Sales User:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Sales User","email":"sales@example.com","password":"salespass123","role":"Sales User"}'
```

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Admin | `admin@example.com` | `adminpass123` | Full CRUD access, including lead deletion and analytics |
| Sales User | `sales@example.com` | `salespass123` | Create, read, update leads. No deletion or admin analytics access. |

## Frontend Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Landing page with feature overview |
| `/login` | Public | Login form with Zod validation |
| `/register` | Public | Registration form with role selection and admin key field |
| `/dashboard` | Authenticated | Main dashboard with tabs (Leads, Email, Analytics, Settings) |
| `/admin` | Admin only | Admin-restricted route to dashboard |

## License

MIT -- Copyright 2026 Atinarapu Karthik
