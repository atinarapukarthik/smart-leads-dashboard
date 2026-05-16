# Smart Leads Dashboard

A strictly typed, full-stack MERN application for managing sales leads with role-based access control, real-time filtering, pagination, and CSV export capabilities.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite 8, TailwindCSS 3, React Router 7, Axios, React Hook Form, Zod |
| **Backend** | Node.js, Express 5, TypeScript, Mongoose 9, bcryptjs, jsonwebtoken, CORS |
| **Database** | MongoDB |
| **Containerization** | Docker, Docker Compose, Nginx (SPA serving) |

TypeScript is enforced across the entire stack with `strict: true` and `noImplicitAny: true`. Zero plain JavaScript is used for application logic.

## Project Structure

```
smart-leads-dashboard/
├── backend/
│   ├── src/
│   │   ├── models/          # Mongoose schemas with TS interfaces
│   │   ├── middleware/      # Auth, RBAC, error handler
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # Express route definitions
│   │   ├── types/           # Express Request augmentation
│   │   └── server.ts        # Application entry point
│   ├── Dockerfile           # Multi-stage Node.js build
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios client + service layer
│   │   ├── components/      # UI state + Lead table
│   │   ├── context/         # AuthContext provider
│   │   ├── hooks/           # Custom hooks (useDebounce)
│   │   ├── pages/           # Route-level components
│   │   ├── routes/          # Router + guards
│   │   ├── types/           # Shared TypeScript interfaces
│   │   └── main.tsx         # Application entry point
│   ├── Dockerfile           # Multi-stage Vite + Nginx build
│   ├── nginx.conf           # SPA routing config
│   └── package.json
├── docker-compose.yml       # Service orchestration
└── README.md
```

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
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

The server starts on `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Ensure VITE_API_BASE_URL=http://localhost:5000/api
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
| `POST` | `/api/auth/register` | No | Register a new user |
| `POST` | `/api/auth/login` | No | Authenticate and receive JWT |

### Leads

| Method | Endpoint | Auth Required | RBAC | Description |
|--------|----------|--------------|------|-------------|
| `POST` | `/api/leads` | Yes | Any | Create a new lead |
| `GET` | `/api/leads` | Yes | Any | List leads (paginated, filtered, sorted) |
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
| Admin | `admin@example.com` | `adminpass123` | Full CRUD access, including lead deletion |
| Sales User | `sales@example.com` | `salespass123` | Create, read, update leads. No deletion access. |

## Features

- **Strict TypeScript**: All models, controllers, and components are fully typed. No `any` types.
- **Role-Based Access Control**: Admin-only deletion enforced at middleware and UI levels.
- **Debounced Search**: 500ms debounce on search input to prevent server flooding.
- **Backend Pagination**: Database-level pagination with `.skip()` and `.limit()`.
- **CSV Export**: Native Blob-based export of current page data.
- **Form Validation**: Zod schema validation with React Hook Form.
- **State Components**: Dedicated Loader, EmptyState, and ErrorFallback components.
- **JWT Authentication**: Auto-attached via Axios request interceptor.
- **401 Auto-Logout**: Response interceptor clears storage and redirects on token expiry.
