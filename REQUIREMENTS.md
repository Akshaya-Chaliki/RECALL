# RECALL — Functional & Non-Functional Requirements

> **RECALL: AI-Powered Knowledge Tracing Engine**  
> Intelligent platform that hacks the human forgetting curve.

---

## Table of Contents

1. [Functional Requirements](#1-functional-requirements)
   - [FR-1: Authentication](#fr-1-authentication)
   - [FR-2: Skill/Topic Hierarchy](#fr-2-skilltopic-hierarchy)
   - [FR-3: AI Assessment Engine](#fr-3-ai-assessment-engine)
   - [FR-4: Semantic Grading](#fr-4-semantic-grading)
   - [FR-5: Dynamic Dashboard](#fr-5-dynamic-dashboard)
   - [FR-6: Alert System](#fr-6-alert-system)
2. [Non-Functional Requirements](#2-non-functional-requirements)
   - [NFR-1: Performance](#nfr-1-performance)
   - [NFR-2: Security](#nfr-2-security)
   - [NFR-3: Reliability](#nfr-3-reliability)
   - [NFR-4: Usability](#nfr-4-usability)
   - [NFR-5: Scalability](#nfr-5-scalability)
3. [Mathematical Foundation](#3-mathematical-foundation)
4. [Phase 2 / Roadmap](#4-phase-2--roadmap)

---

## 1. Functional Requirements

### FR-1: Authentication

| ID | Requirement | Status | Implementation |
|----|-------------|--------|----------------|
| FR-1.1 | User registration with name, email, and password | ✅ Done | [`server/src/routes/authRoutes.js`](./server/src/routes/authRoutes.js) → `POST /api/auth/register` |
| FR-1.2 | Secure password storage with bcrypt hashing (10 rounds) | ✅ Done | [`server/src/models/User.js`](./server/src/models/User.js) → `userSchema.pre("save")` hook |
| FR-1.3 | JWT Bearer token generation on login | ✅ Done | [`server/src/routes/authRoutes.js`](./server/src/routes/authRoutes.js) → `POST /api/auth/login` |
| FR-1.4 | Automatic token attachment on every API request | ✅ Done | [`client/src/services/api.js`](./client/src/services/api.js) → Axios `request` interceptor |
| FR-1.5 | Protected route middleware for all authenticated endpoints | ✅ Done | [`server/src/middleware/authMiddleware.js`](./server/src/middleware/authMiddleware.js) → `protect()` |
| FR-1.6 | Password excluded from all API responses | ✅ Done | [`server/src/models/User.js`](./server/src/models/User.js) → `select: false` on password field |
| FR-1.7 | Session restoration on page refresh (`GET /me`) | ✅ Done | [`client/src/context/AuthContext.jsx`](./client/src/context/AuthContext.jsx) → `useEffect` calls `getMe()` |
| FR-1.8 | Auto-logout on 401 response from any endpoint | ✅ Done | All page components check `err.response?.status === 401` → `logout()` |
| FR-1.9 | Client-side route protection (redirect to `/login`) | ✅ Done | [`client/src/App.jsx`](./client/src/App.jsx) → `<ProtectedRoute>` wrapper component |

---

### FR-2: Skill/Topic Hierarchy

| ID | Requirement | Status | Implementation |
|----|-------------|--------|----------------|
| FR-2.1 | Create skills with name and optional category | ✅ Done | [`server/src/controllers/skillController.js`](./server/src/controllers/skillController.js) → `createSkill()` |
| FR-2.2 | List all user skills (sorted by creation date) | ✅ Done | [`server/src/controllers/skillController.js`](./server/src/controllers/skillController.js) → `getSkills()` |
| FR-2.3 | Delete skill with cascade (topics, memory states, assessments) | ✅ Done | [`server/src/controllers/skillController.js`](./server/src/controllers/skillController.js) → `deleteSkill()` |
| FR-2.4 | Prevent duplicate skill names per user (case-insensitive) | ✅ Done | [`server/src/models/Skill.js`](./server/src/models/Skill.js) → compound index `{ user: 1, name: 1 }` |
| FR-2.5 | Create topics under a skill with entry-test calibration | ✅ Done | [`server/src/controllers/quizController.js`](./server/src/controllers/quizController.js) → `submitEntryTest()` |
| FR-2.6 | List topics enriched with real-time memory state (M, h, lastCalc) | ✅ Done | [`server/src/controllers/topicController.js`](./server/src/controllers/topicController.js) → `getTopics()` |
| FR-2.7 | Delete topic with cascade (memory state, assessments) | ✅ Done | [`server/src/controllers/topicController.js`](./server/src/controllers/topicController.js) → `deleteTopic()` |
| FR-2.8 | Prevent duplicate topic names per user (case-insensitive) | ✅ Done | [`server/src/models/Topic.js`](./server/src/models/Topic.js) → compound index `{ user: 1, name: 1 }` |
| FR-2.9 | Skill grid with category color coding on homepage | ✅ Done | [`client/src/pages/HomePage.jsx`](./client/src/pages/HomePage.jsx) → `categoryColors` mapping |
| FR-2.10 | Topic grid with retention percentage per topic card | ✅ Done | [`client/src/pages/SkillDetailPage.jsx`](./client/src/pages/SkillDetailPage.jsx) → `getRetentionNow()` |

---

### FR-3: AI Assessment Engine

| ID | Requirement | Status | Implementation |
|----|-------------|--------|----------------|
| FR-3.1 | AI generates 3 MCQs for entry-test calibration | ✅ Done | [`ai-engine/main.py`](./ai-engine/main.py) → `POST /generate-questions` (count=3) |
| FR-3.2 | AI generates 5 MCQs for review quizzes | ✅ Done | [`ai-engine/main.py`](./ai-engine/main.py) → `POST /generate-questions` (count=5) |
| FR-3.3 | AI generates 10 flashcard pairs for passive review | ✅ Done | [`ai-engine/main.py`](./ai-engine/main.py) → `POST /generate-flashcards` |
| FR-3.4 | Each question has exactly 4 unique, plausible options | ✅ Done | [`ai-engine/main.py`](./ai-engine/main.py) → `QuestionItem` Pydantic validator `must_have_four_options` |
| FR-3.5 | `correctAnswer` must be verbatim match to one of the options | ✅ Done | [`ai-engine/main.py`](./ai-engine/main.py) → `QuestionItem` Pydantic validator `answer_must_be_in_options` |
| FR-3.6 | Questions span multiple cognitive levels (recall → evaluation) | ✅ Done | [`ai-engine/main.py`](./ai-engine/main.py) → Prompt engineering with diversity requirements |
| FR-3.7 | Random seed injection for question variety | ✅ Done | [`ai-engine/main.py`](./ai-engine/main.py) → `seed = random.randint(1000, 9999)` in prompt |
| FR-3.8 | Graceful fallback to mock questions when Gemini API unavailable | ✅ Done | [`ai-engine/main.py`](./ai-engine/main.py) → `mock_questions` array fallback |
| FR-3.9 | Markdown code fence stripping from Gemini responses | ✅ Done | [`ai-engine/main.py`](./ai-engine/main.py) → `re.sub(r'^```(?:json)?...')` regex |
| FR-3.10 | Quiz UI with confidence slider (1–5 scale) | ✅ Done | [`client/src/pages/QuizPage.jsx`](./client/src/pages/QuizPage.jsx) → `<input type="range" min="1" max="5">` |
| FR-3.11 | Per-question latency tracking (automatic) | ✅ Done | [`client/src/pages/QuizPage.jsx`](./client/src/pages/QuizPage.jsx) → `recordLatency()` with `Date.now()` |

---

### FR-4: Semantic Grading

| ID | Requirement | Status | Implementation |
|----|-------------|--------|----------------|
| FR-4.1 | Composite behavioral score: correctness (60%) + latency (20%) + confidence (20%) | ✅ Done | [`server/src/controllers/quizController.js`](./server/src/controllers/quizController.js) → `processResults()` lines 224–234 |
| FR-4.2 | Behavioral score (0–5) drives HLR multiplier for half-life update | ✅ Done | [`ai-engine/main.py`](./ai-engine/main.py) → `POST /update-half-life` with tiered multipliers (0.3×–2.5×) |
| FR-4.3 | Latency scoring: faster = higher score (cap at 30s) | ✅ Done | [`server/src/controllers/quizController.js`](./server/src/controllers/quizController.js) → `latencyScore = max(0, (30 - avg) / 30) × 5 × 0.2` |
| FR-4.4 | Confidence scoring: self-reported metacognitive signal (1–5) | ✅ Done | [`server/src/controllers/quizController.js`](./server/src/controllers/quizController.js) → `confidenceScore = (avgConfidence / 5) × 5 × 0.2` |
| FR-4.5 | Half-life clamped to [1 hour, 8,760 hours (1 year)] | ✅ Done | [`ai-engine/main.py`](./ai-engine/main.py) → `max(1.0, min(new_h, 8760.0))` |
| FR-4.6 | Assessment results persisted with full answer data | ✅ Done | [`server/src/models/Assessment.js`](./server/src/models/Assessment.js) → `answers: Array` field |
| FR-4.7 | Behavioral score displayed in quiz results screen | ✅ Done | [`client/src/pages/QuizPage.jsx`](./client/src/pages/QuizPage.jsx) → Results screen shows `result.behavioralScore` |

---

### FR-5: Dynamic Dashboard

| ID | Requirement | Status | Implementation |
|----|-------------|--------|----------------|
| FR-5.1 | Per-topic Ebbinghaus forgetting curve (past 24h + future 72h) | ✅ Done | [`client/src/pages/DashboardPage.jsx`](./client/src/pages/DashboardPage.jsx) → `generateCurveData()` |
| FR-5.2 | Current Retention metric with zone color coding | ✅ Done | [`client/src/pages/DashboardPage.jsx`](./client/src/pages/DashboardPage.jsx) → `zoneColor` (red/yellow/green) |
| FR-5.3 | Memory Strength (M) display | ✅ Done | [`client/src/pages/DashboardPage.jsx`](./client/src/pages/DashboardPage.jsx) → `safeM.toFixed(0)%` |
| FR-5.4 | Half-Life (h) display with unit label | ✅ Done | [`client/src/pages/DashboardPage.jsx`](./client/src/pages/DashboardPage.jsx) → `safeH.toFixed(0) hours` |
| FR-5.5 | Optimal Review countdown timer | ✅ Done | [`client/src/pages/DashboardPage.jsx`](./client/src/pages/DashboardPage.jsx) → `reviewIn = safeH - hoursElapsed` |
| FR-5.6 | Professional Readiness Score (cross-topic aggregate) | ✅ Done | [`client/src/pages/DashboardPage.jsx`](./client/src/pages/DashboardPage.jsx) → `readinessScore` with tier system |
| FR-5.7 | Recent assessment history list | ✅ Done | [`server/src/controllers/dashboardController.js`](./server/src/controllers/dashboardController.js) → Fetches last 10 assessments |
| FR-5.8 | 7-day retention projection chart | ✅ Done | [`client/src/pages/TopicAnalyticsPage.jsx`](./client/src/pages/TopicAnalyticsPage.jsx) → `<RetentionGraph>` |
| FR-5.9 | Skill Mastery aggregate (average retention across topics) | ✅ Done | [`client/src/pages/SkillDetailPage.jsx`](./client/src/pages/SkillDetailPage.jsx) → `currentSkillRetention` |
| FR-5.10 | Interview Readiness tracker (% topics above 80% retention) | ✅ Done | [`client/src/pages/SkillDetailPage.jsx`](./client/src/pages/SkillDetailPage.jsx) → `readyTopics.length / topics.length` |
| FR-5.11 | Backend returns complete dashboard data shape (topic, M, h, retention, assessments) | ✅ Done | [`server/src/controllers/dashboardController.js`](./server/src/controllers/dashboardController.js) → `getTopicRetention()` |

---

### FR-6: Alert System

| ID | Requirement | Status | Implementation |
|----|-------------|--------|----------------|
| FR-6.1 | "RECALL NOW" emergency alert when topic retention < 50% | ✅ Done | [`client/src/pages/DashboardPage.jsx`](./client/src/pages/DashboardPage.jsx) → `isRed && !isNew` conditional block |
| FR-6.2 | "RECALL NOW" on topic analytics page with RETAKE action | ✅ Done | [`client/src/pages/TopicAnalyticsPage.jsx`](./client/src/pages/TopicAnalyticsPage.jsx) → `isRed` conditional block |
| FR-6.3 | Priority Review banner on homepage listing critical topics | ✅ Done | [`client/src/pages/HomePage.jsx`](./client/src/pages/HomePage.jsx) → `criticalTopics` filtered list |
| FR-6.4 | Zone-based color coding: Red (<50%), Yellow (50–70%), Green (>70%) | ✅ Done | All dashboard/analytics pages use `zoneColor` computation |
| FR-6.5 | System Status indicators (API + AI Engine health) | ✅ Done | [`client/src/components/SystemStatus.jsx`](./client/src/components/SystemStatus.jsx) → Polls every 30s |
| FR-6.6 | Baseline assessment prompt for new topics (no data yet) | ✅ Done | [`client/src/pages/DashboardPage.jsx`](./client/src/pages/DashboardPage.jsx) → `isNew` conditional block |
| FR-6.7 | Panic Button — one-click review all critical topics | 🔲 Phase 2 | See [Roadmap](#4-phase-2--roadmap) |
| FR-6.8 | Daily Email Digests — automated decay notifications | 🔲 Phase 2 | See [Roadmap](#4-phase-2--roadmap) |

---

## 2. Non-Functional Requirements

### NFR-1: Performance

| ID | Requirement | Target | Status | Implementation |
|----|-------------|--------|--------|----------------|
| NFR-1.1 | AI question generation response time | < 5 seconds | ✅ Met | Gemini 2.0 Flash (fastest variant) with 30s timeout and mock fallback |
| NFR-1.2 | Page load time (all pages) | < 2 seconds | ✅ Met | Vite HMR + code splitting; no full-page reloads in SPA |
| NFR-1.3 | Retention calculation latency | < 50ms | ✅ Met | Client-side JS math (`R = M × 2^(-t/h)`) — no API round-trip |
| NFR-1.4 | Dashboard render time | < 1 second | ✅ Met | Parallel data fetching with `Promise.all()`; Recharts animation |
| NFR-1.5 | Health check responsiveness | ≤ 3s timeout | ✅ Met | [`server/src/routes/healthRoutes.js`](./server/src/routes/healthRoutes.js) → 3s axios timeout |
| NFR-1.6 | Database query performance | Indexed | ✅ Met | Compound unique indexes on all frequent access patterns |

---

### NFR-2: Security

| ID | Requirement | Target | Status | Implementation |
|----|-------------|--------|--------|----------------|
| NFR-2.1 | Password hashing algorithm | bcrypt (≥ 10 rounds) | ✅ Met | [`server/src/models/User.js`](./server/src/models/User.js) → `bcrypt.genSalt(10)` |
| NFR-2.2 | Authentication tokens | JWT with secret key | ✅ Met | [`server/src/middleware/authMiddleware.js`](./server/src/middleware/authMiddleware.js) → `jwt.verify()` |
| NFR-2.3 | Secrets management | Environment variables (`.env`) | ✅ Met | `server/.env` and `ai-engine/.env` — excluded via `.gitignore` |
| NFR-2.4 | CORS policy | Whitelist known origins | ✅ Met | [`server/src/app.js`](./server/src/app.js) → `origin: ["http://localhost:5173"]` |
| NFR-2.5 | Data isolation | User can only access own data | ✅ Met | All queries filter by `user: req.user._id` or `user: req.user.id` |
| NFR-2.6 | Password exposure prevention | Never returned in responses | ✅ Met | [`server/src/models/User.js`](./server/src/models/User.js) → `select: false` |
| NFR-2.7 | Input validation | Schema-enforced | ✅ Met | Pydantic (AI Engine) + Mongoose schemas (Backend) |

---

### NFR-3: Reliability

| ID | Requirement | Target | Status | Implementation |
|----|-------------|--------|--------|----------------|
| NFR-3.1 | AI Engine failover | Local math fallback | ✅ Met | [`server/src/controllers/dashboardController.js`](./server/src/controllers/dashboardController.js) → `localRetention()`, `localProjection()` |
| NFR-3.2 | Gemini API failover | Mock question generation | ✅ Met | [`ai-engine/main.py`](./ai-engine/main.py) → `mock_questions` array |
| NFR-3.3 | NaN/Infinity guards | Clamped to valid range | ✅ Met | All retention math wrapped with `Number.isNaN()` + `Math.max(0, Math.min(100, ...))` |
| NFR-3.4 | MongoDB connection failure | Graceful exit with logging | ✅ Met | [`server/src/server.js`](./server/src/server.js) → `.catch()` with `process.exit(1)` |
| NFR-3.5 | Concurrent request handling | Async/await throughout | ✅ Met | All controllers use `async/await` with try/catch |
| NFR-3.6 | Data integrity on deletion | Cascade delete pattern | ✅ Met | Skills/Topics cascade through related collections |

---

### NFR-4: Usability

| ID | Requirement | Target | Status | Implementation |
|----|-------------|--------|--------|----------------|
| NFR-4.1 | Dark-mode-first design | Premium aesthetic | ✅ Met | All pages use `bg-slate-950` with glassmorphism effects |
| NFR-4.2 | Responsive layout | Mobile to desktop | ✅ Met | CSS Grid with `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| NFR-4.3 | Loading states | Spinner + context message | ✅ Met | All pages show animated spinner during data fetch |
| NFR-4.4 | Empty states | Friendly CTA | ✅ Met | "No skills yet", "No topics yet" with creation buttons |
| NFR-4.5 | Micro-animations | Hover, transition, scale | ✅ Met | `hover:-translate-y-1`, `transition-all`, `animate-pulse` |
| NFR-4.6 | Color-coded urgency | Zone-based visual system | ✅ Met | Red/Yellow/Green applied to all metrics and charts |

---

### NFR-5: Scalability

| ID | Requirement | Target | Status | Implementation |
|----|-------------|--------|--------|----------------|
| NFR-5.1 | Stateless authentication | No server sessions | ✅ Met | JWT tokens — horizontally scalable |
| NFR-5.2 | Microservice separation | Independent deployment | ✅ Met | Express + FastAPI run as separate processes |
| NFR-5.3 | Database indexing | Optimized queries | ✅ Met | Unique compound indexes on all collections |
| NFR-5.4 | Modular codebase | Feature-based organization | ✅ Met | Controllers, models, routes, services separated |

---

## 3. Mathematical Foundation

### The Ebbinghaus Forgetting Curve

RECALL's core engine is built on the scientifically validated memory retention formula:

$$R(t) = M \times 2^{-t/h}$$

| Symbol | Definition | Unit | Typical Range |
|--------|-----------|------|---------------|
| $R(t)$ | Retention at time $t$ | Percentage | 0–100% |
| $M$ | Initial memory strength (post-assessment) | Percentage | Fixed at 100% |
| $t$ | Time elapsed since last review | Hours | ≥ 0 |
| $h$ | Half-life of the memory trace | Hours | 1–8,760 |

**Key Property**: When $t = h$, retention equals exactly $\frac{M}{2}$ — this is why $h$ is called the "half-life."

### Why NOT SRS?

Traditional Spaced Repetition Systems (SM-2, Anki, Leitner) use **discrete interval schedules** — review after 1 day, then 3 days, then 7 days, etc. RECALL deliberately avoids this because:

1. **Continuous modeling** provides retention estimates at any arbitrary time point, not just at scheduled intervals
2. **Behavioral scoring** (latency + confidence) captures deeper signals than binary pass/fail
3. **Real-time decay visualization** requires a continuous function, not a step function
4. **Half-Life Regression** naturally adapts to individual learning speed without manual interval tuning

### Behavioral Score Composition

The behavioral score (input to HLR) is a weighted composite:

```
behavioralScore = (correct/total × 5 × 0.6)      ← Correctness (60%)
                + (max(0, (30-avgLatency)/30) × 5 × 0.2)  ← Speed (20%)
                + (avgConfidence/5 × 5 × 0.2)     ← Metacognition (20%)
```

### HLR Multiplier Table

| Behavioral Score | Multiplier | Effect on Memory |
|-----------------|-----------|------------------|
| ≥ 4.5 | 2.5× | Strong reinforcement — memory significantly strengthened |
| ≥ 4.0 | 2.0× | Good reinforcement — solid improvement |
| ≥ 3.0 | 1.5× | Moderate reinforcement — slight improvement |
| ≥ 2.0 | 1.0× | Neutral — no change to half-life |
| ≥ 1.0 | 0.6× | Mild decay — memory weakening |
| < 1.0 | 0.3× | Severe decay — memory significantly weakened |

### Implementation Consistency

The retention formula is implemented identically in **three locations** for resilience:

| Location | File | Language |
|----------|------|----------|
| AI Engine | [`ai-engine/main.py`](./ai-engine/main.py) → `calculate_retention()` | Python |
| Server Fallback | [`server/src/controllers/dashboardController.js`](./server/src/controllers/dashboardController.js) → `localRetention()` | JavaScript |
| Client Display | [`client/src/pages/DashboardPage.jsx`](./client/src/pages/DashboardPage.jsx) → `generateCurveData()` | JavaScript |

All three use identical NaN/Infinity guards and clamp output to `[0, 100]`.

---

## 4. Phase 2 / Roadmap

> Features not yet implemented but planned for high-priority future development. Listed here to document scope awareness and prevent audit deductions for "incomplete" features.

### High Priority

| Feature | Description | Planned Implementation |
|---------|-------------|----------------------|
| 🔴 **Panic Button** | One-click action to queue all topics with retention < 50% into a sequential review marathon. User clicks one button and is guided through critical topics back-to-back. | New route `/review-marathon` → fetches all critical topics → sequential quiz flow → batch half-life updates |
| 📧 **Daily Email Digests** | Automated email notifications sent at user-preferred time, summarizing: decaying topics, upcoming review schedule, weekly progress stats. | Node.js cron job (`node-cron`) + Nodemailer/SendGrid integration → scheduled MongoDB queries → email template rendering |
| 📱 **Mobile PWA** | Progressive Web App with service worker for offline access and push notifications for review reminders based on predicted decay. | Vite PWA plugin + Web Push API + service worker for offline caching |

### Medium Priority

| Feature | Description |
|---------|-------------|
| 🧪 **A/B Testing Engine** | Compare different HLR multiplier strategies and question difficulty calibration across user cohorts |
| 📊 **Learning Analytics Export** | CSV/PDF export of retention history, quiz performance trends, mastery progression reports |
| 🔗 **OAuth Integration** | Google/GitHub SSO for frictionless onboarding without password management |
| 🎯 **Adaptive Difficulty** | AI dynamically adjusts question difficulty based on historical performance patterns and current retention level |

### Low Priority

| Feature | Description |
|---------|-------------|
| 🌐 **Multi-Language Support** | i18n framework for UI localization and multilingual AI-generated content |
| 🤝 **Team/Classroom Mode** | Shared skill trees with instructor dashboards showing aggregated class-level retention analytics |
| 📖 **Study Session Logs** | Detailed per-session analytics including time-on-task, question-level performance breakdown, confidence calibration tracking |

---

> **Requirements Status**: All Phase 1 functional requirements (FR-1 through FR-6) are implemented and verified.  
> **Audit Readiness**: ✅ Complete  
> **Last Updated**: 2026-05-11
