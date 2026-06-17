# 🐸 Eat The Frog

> **Stop managing tasks. Start executing priorities.**

Eat The Frog is a modern full-stack productivity platform inspired by Brian Tracy's famous productivity principle:

> *"Eat a live frog first thing in the morning and nothing worse will happen to you the rest of the day."*

The application helps users focus on their most important work through intelligent task management, workspace separation, progress tracking, notifications, and productivity-focused design.

---

## ✨ Features

### 🔐 Authentication & Security

* Secure JWT Authentication
* Google OAuth Sign-In
* Protected Routes
* Password Hashing with bcrypt
* Persistent Login Sessions
* Secure API Authorization

---

### 📋 Advanced Task Management

* Create, Edit, Delete Tasks
* Bulk Task Deletion
* Task Completion Tracking
* Priority Levels (High / Medium / Low)
* Due Dates & Optional Due Times
* Past Date Validation
* Overdue Detection
* Task Search & Filtering
* Task Sorting
* Drag-and-Drop Reordering

---

### 🏢 Workspace System

Separate your life into dedicated workspaces:

#### Personal Workspace

* Study Goals
* Health & Fitness
* Personal Projects
* Daily Tasks

#### Organization Workspace

* Team Projects
* Startup Tasks
* Client Work
* Development Roadmaps

Workspace data remains completely isolated.

---

### 🌗 Theme System

Choose how you work:

* ☀ Light Mode
* 🌙 Dark Mode
* 💻 System Mode

Theme preferences persist across sessions and devices.

---

### 🔔 Notifications

#### In-App Notifications

* Overdue Alerts
* Task Reminders
* Status Updates

#### Email Notifications

* Due Tomorrow Reminders
* Overdue Alerts
* Daily Summary
* Weekly Review

> Email notifications may vary depending on SMTP configuration and hosting environment.

---

### 📊 Productivity Dashboard

Track progress with:

* Total Tasks
* Pending Tasks
* Completed Tasks
* Overdue Tasks
* Workspace Statistics
* Completion Tracking
* Productivity Insights Foundation

---

### ⚙️ User Settings

* Profile Management
* Avatar Support
* Theme Preferences
* Notification Preferences
* Workspace Preferences
* Secure Logout
* Account Management

---

### 📱 Progressive Web App (PWA)

Install Eat The Frog directly on:

* Android
* iPhone
* iPad
* Desktop

Use it like a native application.

---

### 🎨 Design Philosophy

Unlike traditional productivity apps, Eat The Frog focuses on a warm and handcrafted experience.

Inspired by:

* Premium notebooks
* Leather journals
* Fountain pens
* Minimalist productivity systems

The goal is to feel human rather than corporate.

---

# 🛠 Technology Stack

## Frontend

* React 19
* Vite
* React Router
* Axios
* Context API
* Custom CSS Design System
* PWA Support

## Backend

* Node.js
* Express.js
* JWT Authentication
* Google OAuth
* Nodemailer
* Node Cron

## Database

* MongoDB Atlas
* Mongoose ODM

## Security

* bcryptjs
* JWT
* Protected Routes
* Secure Environment Variables

## Deployment

* Frontend: Vercel
* Backend: Render
* Database: MongoDB Atlas

---

# 📁 Project Structure

```bash
Eat-The-Frog/
│
├── README.md
│
├── backend/
│   ├── package.json
│   ├── package-lock.json
│   ├── uploads/
│   │   └── avatars/
│   │
│   └── src/
│       ├── server.js
│       │
│       ├── config/
│       │   └── db.js
│       │
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── taskController.js
│       │   └── notificationController.js
│       │
│       ├── middleware/
│       │   ├── auth.js
│       │   └── errorHandler.js
│       │
│       ├── models/
│       │   ├── User.js
│       │   ├── Task.js
│       │   └── Notification.js
│       │
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── taskRoutes.js
│       │   └── notificationRoutes.js
│       │
│       ├── services/
│       │   └── emailService.js
│       │
│       └── tests/
│           ├── sync-audit.test.js
│           ├── filtering-audit.test.js
│           ├── security-audit.test.js
│           ├── workspace-theme-audit.test.js
│           ├── settings-profile-audit.test.js
│           ├── subtask-hierarchy-audit.test.js
│           └── analytics-notifications-audit.test.js
│
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── index.html
│   │
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   ├── pwa-192x192.png
│   │   └── pwa-512x512.png
│   │
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── App.css
│       ├── index.css
│       │
│       ├── assets/
│       │   ├── hero.png
│       │   └── vite.svg
│       │
│       ├── components/
│       │
│       │   ├── auth/
│       │   │   ├── LoginForm.jsx
│       │   │   ├── SignupForm.jsx
│       │   │   ├── ProfileSetupForm.jsx
│       │   │   └── Auth Styling
│       │   │
│       │   ├── dashboard/
│       │   │   ├── DashboardLayout
│       │   │   ├── Sidebar
│       │   │   ├── TaskList
│       │   │   ├── TaskCard
│       │   │   ├── AddTaskForm
│       │   │   ├── EditTaskModal
│       │   │   ├── SettingsModal
│       │   │   ├── NotificationCenter
│       │   │   ├── AnalyticsDashboard
│       │   │   ├── StatsBar
│       │   │   ├── FilterBar
│       │   │   ├── ConfirmDeleteModal
│       │   │   └── LogoutModal
│       │   │
│       │   ├── landing/
│       │   │   ├── Navbar
│       │   │   ├── Hero
│       │   │   ├── Features
│       │   │   ├── HowItWorks
│       │   │   └── Footer
│       │   │
│       │   └── common/
│       │       ├── ProtectedRoute
│       │       ├── GuestRoute
│       │       ├── Toast
│       │       ├── LoadingSpinner
│       │       └── EmptyState
│       │
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   ├── TaskContext.jsx
│       │   └── ThemeContext.jsx
│       │
│       ├── services/
│       │   ├── api.js
│       │   ├── authService.js
│       │   ├── taskService.js
│       │   └── notificationService.js
│       │
│       ├── pages/
│       │   ├── LandingPage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── SignupPage.jsx
│       │   ├── ProfileSetupPage.jsx
│       │   ├── DashboardPage.jsx
│       │   └── NotFoundPage.jsx
│       │
│       ├── hooks/
│       │
│       └── utils/
│           └── dateUtils.js
│
└── Deployment
    ├── Frontend → Vercel
    ├── Backend → Render
    └── Database → MongoDB Atlas
```

---

# 🚀 Local Development Setup

## Prerequisites

* Node.js 18+
* MongoDB Atlas Account
* Google Cloud OAuth Credentials
* Gmail App Password (Optional)

---

## Clone Repository

```bash
git clone https://github.com/Darshilmodi15/Eat-the-Frog.git

cd Eat-the-Frog
```

---

## Backend Setup

```bash
cd backend

npm install
```

Create:

```env
.env
```

Example:

```env
PORT=5000

MONGO_URI=

JWT_SECRET=

CLIENT_URL=

GOOGLE_CLIENT_ID=

EMAIL_USER=

EMAIL_PASS=
```

Run:

```bash
npm run dev
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Application:

```bash
http://localhost:5173
```

---

# 🌍 Environment Variables

## Backend

| Variable         | Purpose                  |
| ---------------- | ------------------------ |
| PORT             | Express Server Port      |
| MONGO_URI        | MongoDB Atlas Connection |
| JWT_SECRET       | JWT Signing Secret       |
| CLIENT_URL       | Frontend URL             |
| GOOGLE_CLIENT_ID | Google OAuth Client ID   |
| EMAIL_USER       | Notification Email       |
| EMAIL_PASS       | Gmail App Password       |

---

## Frontend

| Variable              | Purpose                |
| --------------------- | ---------------------- |
| VITE_API_URL          | Backend API URL        |
| VITE_GOOGLE_CLIENT_ID | Google OAuth Client ID |

---

# 🔒 Security Features

* Password Hashing
* JWT Authentication
* Protected API Routes
* User Data Isolation
* Workspace Isolation
* Secure Environment Variables
* Google OAuth Verification

---

# 📈 Roadmap

### Completed

* JWT Authentication
* Google OAuth
* Task CRUD
* Workspaces
* Theme System
* PWA
* Notification System
* User Settings
* Responsive UI

### Future Enhancements

* Task Subtasks & Hierarchies
* Advanced Productivity Analytics
* Streak Tracking
* Calendar View
* Data Export
* Mobile Application

---

# 🌐 Deployment

### Frontend

Deploy to:

* Vercel

### Backend

Deploy to:

* Render

### Database

Deploy using:

* MongoDB Atlas

---

# 👨‍💻 Author

### Darshil Modi

B.Tech Student • Full Stack Developer

---

# ⭐ Why Eat The Frog?

Most task managers help users organize tasks.

Eat The Frog is designed to help users execute the tasks that matter most.

Focus first.

Execute consistently.

Build momentum.

🐸 Eat The Frog.
