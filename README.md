 Eat The Frog — Task Manager

> *"If it's your job to eat a frog, it's best to do it first thing in the morning."* — Mark Twain

A focused, full-stack task management application built on one proven productivity principle: **tackle your hardest task first**.

## ✨ Features

- **User Authentication** — Secure signup/login with JWT
- **Personal Dashboards** — Each user has their own private task workspace
- **Full CRUD** — Create, read, update, and delete tasks
- **Smart Filters** — Filter by All / Pending / Completed; sort by priority, due date, or creation date
- **Client-Side Search** — Instantly find tasks by title or description
- **Priority System** — High / Medium / Low with color-coded badges
- **Overdue Alerts** — Visual indicators for past-due tasks
- **Email Notifications** — Daily email reminders for overdue tasks (via Nodemailer + node-cron)
- **Progressive Web App** — Installable on mobile home screens for quick access
- **Responsive Design** — Works beautifully on desktop, tablet, and phone
- **Beautiful UI** — Warm, luxury aesthetic inspired by leather notebooks & fountain pens

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite |
| Styling | Plain CSS (custom design system) |
| Backend | Node.js + Express |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Email | Nodemailer + node-cron |
| HTTP Client | Axios |
| PWA | vite-plugin-pwa |

## 📁 Project Structure

```
Task Manager/
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── components/   # Landing, Auth, Dashboard, Common
│   │   ├── context/      # AuthContext, TaskContext
│   │   ├── pages/        # LandingPage, LoginPage, DashboardPage, etc.
│   │   ├── services/     # API layer (Axios)
│   │   └── utils/        # Date utilities
│   └── vite.config.js
├── backend/           # Node.js + Express
│   ├── src/
│   │   ├── config/       # Database connection
│   │   ├── controllers/  # Auth & Task controllers
│   │   ├── middleware/   # JWT auth, error handler
│   │   ├── models/       # User & Task models
│   │   ├── routes/       # API routes
│   │   └── services/     # Email notification service
│   └── .env.example
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Gmail account with App Password (for email notifications)

### 1. Clone the repository
```bash
git clone https://github.com/Darshilmodi15/Task-Management-.git
cd Task-Management-
```

### 2. Set up the backend
```bash
cd backend
npm install

# Create .env file (see .env.example)
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and email credentials

npm run dev
```

### 3. Set up the frontend
```bash
cd frontend
npm install
npm run dev
```

The app will be running at `http://localhost:5173`

### Environment Variables

**Backend (.env)**
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `CLIENT_URL` | Frontend URL for CORS |
| `EMAIL_USER` | Gmail address for notifications |
| `EMAIL_PASS` | Gmail App Password |

**Frontend (.env)**
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user (protected) |

### Tasks (all protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (`?status=`, `?sort=`, `?search=`) |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get single task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| PATCH | `/api/tasks/reorder` | Reorder tasks |

## 📱 PWA Installation

On mobile devices, you can install the app to your home screen:
1. Open the app in your mobile browser
2. Tap the browser menu → "Add to Home Screen"
3. The app will launch as a standalone application

## 🌐 Deployment

- **Frontend** → Vercel (build command: `npm run build`)
- **Backend** → Render / Heroku (set environment variables)

## 👤 Author

**Darshil Modi** — [GitHub](https://github.com/Darshilmodi15)

---

Built with ❤️ and determination. Eat the frog first! 🐸
