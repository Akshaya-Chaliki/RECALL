# RECALL — Requirements Checklist

> **Version**: 1.0.0 (Expo Release)  
> **Last Updated**: 2026-05-11  
> **Architecture**: React (Vite) → Node.js/Express → FastAPI (Gemini 1.5 Flash) → MongoDB Atlas

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Technology Stack](#2-architecture--technology-stack)
3. [Authentication & Security](#3-authentication--security)
4. [Data Models (MongoDB)](#4-data-models-mongodb)
5. [AI Engine (FastAPI Microservice)](#5-ai-engine-fastapi-microservice)
6. [Memory Model — Ebbinghaus Forgetting Curve](#6-memory-model--ebbinghaus-forgetting-curve)
7. [API Endpoints (Node.js Backend)](#7-api-endpoints-nodejs-backend)
8. [Frontend Pages & Components](#8-frontend-pages--components)
9. [User Flows](#9-user-flows)
10. [Professional Readiness Score](#10-professional-readiness-score)
11. [Error Handling & Resilience](#11-error-handling--resilience)
12. [Deployment & Environment](#12-deployment--environment)
13. [Testing & Verification](#13-testing--verification)

---

## 1. Project Overview

**RECALL** is an AI-driven memory retention platform that uses the **Ebbinghaus Forgetting Curve** and **Half-Life Regression (HLR)** to scientifically track and optimize knowledge retention. Users organize learning into Skills → Topics, take AI-generated quizzes, and receive real-time memory decay analytics.

### Core Value Proposition
- **Not SRS** — Pure continuous exponential decay modeling (no SM-2 intervals)
- **AI-Generated Assessments** — Gemini 1.5 Flash produces unique, challenging MCQs
- **Behavioral Scoring** — Factors correctness (60%), response latency (20%), and self-reported confidence (20%)
- **Real-Time Decay Visualization** — Interactive Ebbinghaus curves with zone-based urgency alerts

---

## 2. Architecture & Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite | SPA with client-side routing |
| **UI Framework** | TailwindCSS (utility classes) | Responsive, dark-mode-first design |
| **Charts** | Recharts | Retention curve visualization |
| **Icons** | Lucide React | Consistent icon system |
| **Backend** | Node.js + Express (ES Modules) | REST API, JWT auth, business logic |
| **AI Engine** | Python FastAPI | Gemini integration, HLR math |
| **AI Model** | Google Gemini 1.5 Flash | Question/flashcard generation |
| **Database** | MongoDB Atlas (Replica Set) | Persistent storage |
| **Auth** | JWT (Bearer tokens) + bcrypt | Stateless authentication |

### Checklist

- [x] Three-tier architecture: Client → Server → AI Engine
- [x] ES Module syntax throughout Node.js backend (`import`/`export`)
- [x] CORS configured for `localhost:5173` (Vite dev server)
- [x] Environment variables via `.env` files (both server and AI engine)
- [x] No SRS algorithm contamination (SM-2, Anki-style intervals, etc.)

---

## 3. Authentication & Security

### JWT Authentication Flow

| Requirement | Status | Details |
|-------------|--------|---------|
| User registration with name, email, password | ✅ | `POST /api/auth/register` |
| Password hashing with bcrypt (10 rounds) | ✅ | `userSchema.pre("save")` hook |
| JWT token generation on login | ✅ | `POST /api/auth/login` |
| Token stored in `localStorage` as `recall_token` | ✅ | Client-side persistence |
| Bearer token attached via Axios interceptor | ✅ | `api.js` request interceptor |
| Protected routes middleware (`protect`) | ✅ | Verifies JWT, attaches `req.user` |
| Password excluded from queries (`select: false`) | ✅ | User model configuration |
| `GET /api/auth/me` for session restoration | ✅ | Returns current user profile |
| 401 handling with auto-logout on client | ✅ | All pages check for 401 responses |

---

## 4. Data Models (MongoDB)

### 4.1 User Model (`User.js`)

| Field | Type | Constraints |
|-------|------|-------------|
| `name` | String | Required, trimmed |
| `email` | String | Required, unique, lowercase |
| `password` | String | Required, min 6 chars, `select: false` |
| `timestamps` | Auto | `createdAt`, `updatedAt` |

**Methods**:
- `matchPassword(candidatePassword)` — bcrypt comparison

---

### 4.2 Skill Model (`Skill.js`)

| Field | Type | Constraints |
|-------|------|-------------|
| `user` | ObjectId → User | Required |
| `name` | String | Required, trimmed |
| `category` | String | Default: "General" |

**Index**: `{ user: 1, name: 1 }` — unique (no duplicate skill names per user)

---

### 4.3 Topic Model (`Topic.js`)

| Field | Type | Constraints |
|-------|------|-------------|
| `user` | ObjectId → User | Required |
| `skill` | ObjectId → Skill | Required |
| `name` | String | Required, trimmed |
| `description` | String | Default: "" |
| `category` | String | Default: "General" |

**Index**: `{ user: 1, name: 1 }` — unique (no duplicate topic names per user)

---

### 4.4 MemoryState Model (`MemoryState.js`)

| Field | Type | Constraints |
|-------|------|-------------|
| `user` | ObjectId → User | Required |
| `topic` | ObjectId → Topic | Required |
| `initialMemoryStrength` | Number | Default: 100 |
| `halfLife` | Number | Default: 24 (hours) |
| `lastCalculated` | Date | Default: `Date.now` |

**Index**: `{ user: 1, topic: 1 }` — unique (one state per user-topic pair)

**Key Semantics**:
- `initialMemoryStrength` (M) = 100% after each quiz (reset on assessment)
- `halfLife` (h) = hours until retention drops to 50% of M
- `lastCalculated` = timestamp of the most recent quiz submission

---

### 4.5 Assessment Model (`Assessment.js`)

| Field | Type | Constraints |
|-------|------|-------------|
| `user` | ObjectId → User | Required |
| `topic` | ObjectId → Topic | Required |
| `score` | Number | Required (raw correct count) |
| `answers` | Array | Default: [] |

**`answers` array items** (for regular quizzes):
```json
{
  "question": "string",
  "selectedOption": "string",
  "latency": "number (seconds)",
  "confidence": "number (1-5)",
  "confidenceLevel": "number (1-5)"
}
```

---

## 5. AI Engine (FastAPI Microservice)

### 5.1 Configuration

| Setting | Value |
|---------|-------|
| Model | `gemini-2.0-flash` |
| Temperature | 0.8 |
| Top-P | 0.95 |
| Port | 8001 (configurable via `AI_ENGINE_URL`) |
| Fallback | Mock questions if `GEMINI_API_KEY` not set |

### 5.2 Endpoints

| Endpoint | Method | Purpose | Input | Output |
|----------|--------|---------|-------|--------|
| `/` | GET | Health check | — | `{ status, gemini }` |
| `/generate-questions` | POST | AI MCQ generation | `{ topic_name, count }` | `{ topic, questions[] }` |
| `/generate-flashcards` | POST | AI flashcard generation | `{ topic_name }` | `{ topic, flashcards[] }` |
| `/update-half-life` | POST | HLR half-life update | `{ score, current_half_life, avg_latency, avg_confidence }` | `{ new_half_life }` |
| `/calculate-retention` | POST | Ebbinghaus retention | `{ half_life, hours_passed }` | `{ retention_percentage }` |
| `/calculate-projection` | POST | 7-day decay projection | `{ half_life, m, days }` | `{ projection[] }` |

### 5.3 Question Validation (Pydantic)

- [x] Each question has exactly 4 options
- [x] `correctAnswer` must be one of the 4 options (verbatim match)
- [x] JSON output only — no markdown fences from Gemini (regex stripped)
- [x] Random seed injected per request for diversity
- [x] Prompt requires: recall, understanding, application, analysis, evaluation mix

### 5.4 HLR Multiplier Table

| Score Range | Multiplier | Effect |
|-------------|-----------|--------|
| ≥ 4.5 | 2.5× | Strong reinforcement |
| ≥ 4.0 | 2.0× | Good reinforcement |
| ≥ 3.0 | 1.5× | Moderate reinforcement |
| ≥ 2.0 | 1.0× | No change |
| ≥ 1.0 | 0.6× | Decay acceleration |
| < 1.0 | 0.3× | Severe decay |

**Clamps**: `new_h ∈ [1 hour, 8760 hours (1 year)]`

---

## 6. Memory Model — Ebbinghaus Forgetting Curve

### Core Formula

```
R(t) = M × 2^(-t/h)
```

| Variable | Meaning | Range |
|----------|---------|-------|
| R(t) | Retention at time t | 0–100% |
| M | Initial memory strength | 100% (post-quiz) |
| t | Hours since last assessment | ≥ 0 |
| h | Half-life of the memory | 1–8,760 hours |

### Checklist

- [x] Formula implemented identically in Python (`calculate-retention`) and JS (local fallback)
- [x] `NaN`/`Infinity` guards on all retention calculations
- [x] Half-life clamped to `[0.1, 8760]` hours everywhere
- [x] No SRS interval arrays, no SM-2, no Leitner box logic
- [x] Retention computed in real-time (not cached/stale)
- [x] Local fallback if AI Engine is unreachable (same formula)

### Behavioral Score Composition

The behavioral score (0–5) fed into `update-half-life` is a weighted composite:

```
behavioralScore = correctness × 0.6 + latencyScore × 0.2 + confidenceScore × 0.2
```

| Component | Weight | Formula |
|-----------|--------|---------|
| Correctness | 60% | `(correct / total) × 5 × 0.6` |
| Latency | 20% | `max(0, (30 - avgLatency) / 30) × 5 × 0.2` |
| Confidence | 20% | `(avgConfidence / 5) × 5 × 0.2` |

---

## 7. API Endpoints (Node.js Backend)

### 7.1 Auth Routes (`/api/auth`)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/register` | Inline | Create user, return JWT |
| POST | `/login` | Inline | Authenticate, return JWT |
| GET | `/me` | Inline | Get current user (protected) |

### 7.2 Skill Routes (`/api/skills`)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/` | `getSkills` | List user's skills |
| POST | `/` | `createSkill` | Create skill (duplicate check) |
| DELETE | `/:id` | `deleteSkill` | Cascade delete: skill → topics → memoryStates → assessments |

### 7.3 Topic Routes (`/api/topics`)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/` | `getTopics` | List topics (with `?skillId=` filter), includes `memoryState` |
| POST | `/` | `createTopic` | Create topic (duplicate check) |
| DELETE | `/:id` | `deleteTopic` | Cascade delete: topic → memoryState → assessments |

**Key**: `getTopics` enriches each topic with a `memoryState` object `{ M, h, lastCalculated }` for client-side retention computation.

### 7.4 Quiz Routes (`/api/quiz`)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/entry-test` | `entryTest` | Generate 3 MCQs for new topic calibration |
| POST | `/entry-test/submit` | `submitEntryTest` | Create Topic + Assessment + MemoryState atomically |
| GET | `/:topicId/questions` | `getQuestions` | Generate 5 MCQs for review quiz |
| POST | `/:topicId/results` | `processResults` | Submit quiz, compute behavioral score, update HLR |
| GET | `/:topicId/flashcards` | `getFlashcards` | Generate 10 flashcard pairs |

### 7.5 Dashboard Routes (`/api/dashboard`)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/:topicId/retention` | `getTopicRetention` | Full dashboard data: topic, M, h, retention, assessments, projection |

**Response shape**:
```json
{
  "success": true,
  "data": {
    "topic": { "name": "...", "category": "..." },
    "M": 100,
    "h": 24,
    "lastCalculated": "ISO date",
    "currentRetention": 85.3,
    "assessments": [{ "_id": "...", "score": 4, "dateTaken": "ISO date" }],
    "isNew": false,
    "retentionPercentage": 85.3,
    "halfLife": 24,
    "projection": [{ "day": 0, "retention": 85.3 }, ...]
  }
}
```

### 7.6 Health Routes (`/api/health`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API health check |
| GET | `/ai-engine` | Proxied AI Engine health check (3s timeout) |

---

## 8. Frontend Pages & Components

### 8.1 Pages

| Page | Route | Purpose |
|------|-------|---------|
| `LoginPage` | `/login` | Email/password authentication |
| `RegisterPage` | `/register` | New user registration |
| `HomePage` | `/` | Skill grid, Priority Review alerts, System Status |
| `SkillDetailPage` | `/skills/:skillId/topics` | Topic grid, Skill Mastery graph, Interview Readiness tracker, Test-Before-Add modal |
| `DashboardPage` | `/dashboard/:topicId` | Per-topic Ebbinghaus curve, 5 metrics, Professional Readiness, assessment history |
| `QuizPage` | `/quiz/:topicId` | 5-question AI MCQ with confidence slider, behavioral tracking |
| `TopicAnalyticsPage` | `/topics/:topicId/analytics` | 7-day projection, RECALL NOW alert, metric cards |

### 8.2 Components

| Component | Purpose |
|-----------|---------|
| `RetentionGraph` | Reusable Recharts area chart for retention curves |
| `SystemStatus` | Live API + AI Engine status indicators (green/red dots) |

### 8.3 UI Features Checklist

- [x] Dark-mode-first design (slate-950 background)
- [x] Glassmorphism effects (backdrop-blur, semi-transparent borders)
- [x] Zone-based color coding: Red (<50%), Yellow (50–70%), Green (>70%)
- [x] Animated loading spinners (CSS `animate-spin`)
- [x] Hover micro-animations (`hover:-translate-y-1`, scale effects)
- [x] Gradient buttons (indigo-to-purple, red-to-red, emerald-to-teal)
- [x] Responsive grid layouts (1/2/3 columns)
- [x] Protected routes with automatic redirect to `/login`
- [x] "RECALL NOW" emergency alert when retention < 50%
- [x] Progress bars on quiz flow
- [x] Confidence slider (1–5) with live label updates

---

## 9. User Flows

### 9.1 Registration & Login
```
Register → Server hashes password → JWT returned → Stored in localStorage → Redirect to /
Login → Server verifies bcrypt → JWT returned → AuthContext updated → Redirect to /
```

### 9.2 Add Skill
```
HomePage → "Add Skill" modal → Name + Category → POST /api/skills → Grid refreshes
```

### 9.3 Test-Before-Add (New Topic)
```
SkillDetailPage → "Add Topic" → Enter name →
AI generates 3 entry-test MCQs →
User answers 3 questions →
Submit → Creates Topic + Assessment + MemoryState (initial half-life based on score) →
Topic appears in grid with computed retention
```

### 9.4 Regular Review Quiz
```
DashboardPage or TopicAnalyticsPage → "Take Quiz" →
AI generates 5 MCQs (30s timeout) →
User answers with confidence slider (1–5) →
Latency tracked per question →
Submit → behavioralScore computed →
Python update-half-life called →
MemoryState updated → Results shown →
Navigate to TopicAnalyticsPage (fromQuiz animation)
```

### 9.5 Memory Decay Monitoring
```
Topic card shows real-time retention (client-side R(t) = M * 2^(-t/h)) →
If < 50%: Red zone, Priority Review alerts on HomePage →
DashboardPage: Full Ebbinghaus curve (past 24h + future 72h) →
TopicAnalyticsPage: 7-day projection chart
```

---

## 10. Professional Readiness Score

### Definition
The **Professional Readiness Score** is a cross-topic aggregate metric displayed on the DashboardPage. It represents the user's overall knowledge readiness, computed as:

```
Readiness = Average(R(t) for all user topics)
```

Where each `R(t)` is the current real-time retention of a topic.

### Tier System

| Score | Tier | Badge Color |
|-------|------|-------------|
| ≥ 85% | Expo Ready | Green (#22c55e) |
| ≥ 70% | Strong | Blue (#3b82f6) |
| ≥ 50% | Moderate | Yellow (#eab308) |
| < 50% | Needs Work | Red (#ef4444) |

### UI Components
- Score displayed as large numeral with `%` suffix
- Colored tier badge (e.g., "Expo Ready")
- Mini progress bar showing fill level
- Subtle glow effect matching tier color
- Hover interaction with increased glow opacity

### Interview Readiness (SkillDetailPage)
A related but **per-skill** metric on the SkillDetailPage:
- Counts topics with retention > 80% vs total topics
- Displayed as percentage with progress bar
- Labels: "Interview Ready" (≥80%), "Needs Practice" (≥50%), "Not Ready" (<50%)

---

## 11. Error Handling & Resilience

### Backend

| Scenario | Handling |
|----------|----------|
| AI Engine unreachable | Local fallback for retention/projection math |
| AI Engine timeout | 5s for retention, 30s for question generation |
| Duplicate skill/topic | 400 with descriptive message |
| Invalid JWT | 401 with "Not authorized" |
| MongoDB connection failure | Process exits with `[FATAL]` log |
| Gemini API failure | Falls back to mock questions |

### Frontend

| Scenario | Handling |
|----------|----------|
| 401 from any API call | Auto-logout, redirect to `/login` |
| Quiz generation failure | Error screen with "Retry" button |
| Quiz submission failure | Error message displayed |
| Empty topic list | Friendly empty state with CTA |
| `NaN`/`undefined` retention | Clamped to 0 with safe math throughout |
| AI Engine offline | SystemStatus shows red dot; app continues with local math |

---

## 12. Deployment & Environment

### Environment Variables

#### Server (`.env`)
```
PORT=5000
MONGO_URI=mongodb://...  (MongoDB Atlas connection string)
JWT_SECRET=recall_super_secret_key
AI_ENGINE_URL=http://localhost:8001
```

#### AI Engine (`.env`)
```
GEMINI_API_KEY=<your-gemini-api-key>
```

### Running Locally

| Service | Command | Port |
|---------|---------|------|
| Client (Vite) | `cd client && npm run dev` | 5173 |
| Server (Node.js) | `cd server && npm run dev` | 5000 |
| AI Engine (FastAPI) | `cd ai-engine && uvicorn main:app --port 8001` | 8001 |

### Prerequisites
- Node.js ≥ 18
- Python ≥ 3.10
- MongoDB Atlas cluster (or local MongoDB)
- Google Gemini API key (optional — fallback to mocks)

---

## 13. Testing & Verification

### System Health Checks
- [x] `GET /api/health` returns `{ success: true }`
- [x] `GET /api/health/ai-engine` proxies to Python `/`
- [x] SystemStatus component polls every 30s

### Core Flow Verification
- [x] Register → Login → Create Skill → Add Topic (with entry test) → Take Quiz → View Dashboard
- [x] Retention values are numeric and within [0, 100]
- [x] Half-life updates correctly based on quiz performance
- [x] Dashboard shows topic name, retention %, M, h, review countdown
- [x] Professional Readiness Score renders without NaN/crashes
- [x] Assessment history displays with formatted dates
- [x] "RECALL NOW" alert triggers when retention < 50%
- [x] Zone colors transition correctly (green → yellow → red)

### Stability Safeguards
- [x] All `Number()` conversions wrapped with `isNaN` checks
- [x] All `Math.pow(2, -t/h)` guarded against `h = 0`
- [x] Retention values clamped to `[0, 100]` at every computation point
- [x] AI Engine timeouts prevent UI hanging
- [x] Local fallback math mirrors Python engine exactly
- [x] No `console.log` of sensitive data in production

---

> **Status**: ✅ Expo-Ready  
> **Architecture**: Three-tier (React → Express → FastAPI + MongoDB Atlas)  
> **Core Model**: Ebbinghaus Forgetting Curve with Half-Life Regression  
> **AI Provider**: Google Gemini 1.5 Flash  
> **Key Differentiator**: No SRS — Pure continuous exponential decay with behavioral scoring
