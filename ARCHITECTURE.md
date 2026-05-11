# RECALL — System Architecture

> **RECALL: AI-Powered Knowledge Tracing Engine**  
> Intelligent platform that hacks the human forgetting curve.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Data Flow Diagrams](#2-data-flow-diagrams)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [AI Engine Architecture](#5-ai-engine-architecture)
6. [Data Model (MongoDB)](#6-data-model-mongodb)
7. [Memory Retention Engine](#7-memory-retention-engine)
8. [Authentication Flow](#8-authentication-flow)
9. [API Contract Specification](#9-api-contract-specification)
10. [Resilience & Failover Strategy](#10-resilience--failover-strategy)
11. [Security Architecture](#11-security-architecture)
12. [Performance Architecture](#12-performance-architecture)

---

## 1. High-Level Architecture

RECALL follows a **three-tier microservice architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              React 18 SPA (Vite Dev Server :5173)             │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐   │  │
│  │  │ AuthCtx │ │ Recharts │ │  Lucide  │ │  Axios Client   │   │  │
│  │  └─────────┘ └──────────┘ └──────────┘ └────────┬────────┘   │  │
│  └──────────────────────────────────────────────────┼────────────┘  │
├──────────────────────── HTTP/REST ───────────────────┼──────────────┤
│                        BUSINESS LAYER                │              │
│  ┌──────────────────────────────────────────────────┼────────────┐  │
│  │            Express Server (Node.js :5000)        │            │  │
│  │  ┌──────────┐ ┌──────────────┐ ┌────────────────┼──────────┐ │  │
│  │  │JWT Auth  │ │ Controllers  │ │   AI Proxy     │          │ │  │
│  │  │Middleware│ │ (CRUD + BL)  │ │  (quiz/dash)   ▼          │ │  │
│  │  └──────────┘ └──────┬───────┘ └────────────────┬──────────┘ │  │
│  └───────────────────────┼─────────────────────────┼────────────┘  │
├──────────────────────────┼──────── HTTP/REST ───────┼───────────────┤
│                          │    INTELLIGENCE LAYER    │               │
│  ┌───────────────────────┼─────────────────────────┼────────────┐  │
│  │        FastAPI AI Engine (Python :8001)          │            │  │
│  │  ┌────────────────┐ ┌──────────────┐ ┌──────────┴──────────┐ │  │
│  │  │ Gemini 2.0     │ │  HLR Math    │ │ Pydantic Validation │ │  │
│  │  │ Flash Client   │ │  Engine      │ │ (Strict Schema)     │ │  │
│  │  └────────────────┘ └──────────────┘ └─────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────────────────────┤
│                         DATA LAYER                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              MongoDB Atlas (Replica Set)                      │  │
│  │  ┌──────┐ ┌───────┐ ┌───────┐ ┌─────────────┐ ┌──────────┐ │  │
│  │  │Users │ │Skills │ │Topics │ │MemoryStates │ │Assessments│ │  │
│  │  └──────┘ └───────┘ └───────┘ └─────────────┘ └──────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Separation of Concerns** | UI rendering (React), business logic (Express), AI computation (FastAPI), data persistence (MongoDB) are fully decoupled |
| **Graceful Degradation** | If AI Engine goes down, local JS math provides identical retention/projection calculations |
| **Stateless Auth** | JWT tokens — no server-side sessions, horizontally scalable |
| **ES Module Consistency** | Both client and server use `import`/`export` syntax throughout |
| **No SRS Contamination** | Architecture deliberately excludes SM-2, Leitner, or any interval-based algorithms |

### Why Decouple with FastAPI?

The AI tier is deliberately separated from the Node.js backend for the following reasons:

1. **SDK Ecosystem**: The Google Gemini SDK (`google-generativeai`) is Python-native with first-class support for prompt engineering, streaming, and structured output — making Python the natural choice for the LLM integration layer.
2. **Event Loop Protection**: LLM inference calls to Gemini can take 2–10 seconds. Running these on the Node.js event loop would block all concurrent Express requests. FastAPI's async architecture handles long-running AI calls without starving other users.
3. **Independent Scaling**: The AI engine can be horizontally scaled independently of the CRUD backend — critical for production, where quiz generation is the most resource-intensive operation.
4. **Graceful Degradation**: If the FastAPI service goes down, the Express server continues to serve all non-AI features and falls back to local JavaScript math for retention calculations.

---

## 2. Data Flow Diagrams

### 2.1 Topic Creation with Entry Test

```
User                    React Client              Express Server          FastAPI AI Engine       MongoDB
 │                          │                          │                        │                   │
 │  1. Enter topic name     │                          │                        │                   │
 ├─────────────────────────▶│                          │                        │                   │
 │                          │  2. POST /quiz/entry-test│                        │                   │
 │                          ├─────────────────────────▶│                        │                   │
 │                          │                          │  3. POST /generate-questions (count=3)     │
 │                          │                          ├───────────────────────▶│                   │
 │                          │                          │  4. { questions[] }    │                   │
 │                          │                          │◀───────────────────────┤                   │
 │                          │  5. Return 3 MCQs        │                        │                   │
 │                          │◀─────────────────────────┤                        │                   │
 │  6. Answer questions     │                          │                        │                   │
 ├─────────────────────────▶│                          │                        │                   │
 │                          │  7. POST /entry-test/submit (score, answers)      │                   │
 │                          ├─────────────────────────▶│                        │                   │
 │                          │                          │  8. POST /update-half-life                 │
 │                          │                          ├───────────────────────▶│                   │
 │                          │                          │  9. { new_half_life }  │                   │
 │                          │                          │◀───────────────────────┤                   │
 │                          │                          │  10. Create Topic + Assessment + MemoryState
 │                          │                          ├──────────────────────────────────────────▶│
 │                          │  11. { topic, score, halfLife }                   │                   │
 │                          │◀─────────────────────────┤                        │                   │
```

### 2.2 Review Quiz with Behavioral Scoring

```
User                    React Client              Express Server          FastAPI AI Engine       MongoDB
 │                          │                          │                        │                   │
 │  1. Click "Take Quiz"   │                          │                        │                   │
 ├─────────────────────────▶│                          │                        │                   │
 │                          │  2. GET /quiz/:id/questions                       │                   │
 │                          ├─────────────────────────▶│                        │                   │
 │                          │                          │  3. POST /generate-questions (count=5)     │
 │                          │                          ├───────────────────────▶│                   │
 │                          │  4. 5 AI-generated MCQs  │                        │                   │
 │                          │◀─────────────────────────┤                        │                   │
 │  5. Answer + confidence  │                          │                        │                   │
 │     + latency tracked    │                          │                        │                   │
 ├─────────────────────────▶│                          │                        │                   │
 │                          │  6. POST /quiz/:id/results                       │                   │
 │                          │     { score, answers[] with latency/confidence }  │                   │
 │                          ├─────────────────────────▶│                        │                   │
 │                          │                          │  7. Compute behavioral score:              │
 │                          │                          │     correctness×0.6 + latency×0.2          │
 │                          │                          │     + confidence×0.2                       │
 │                          │                          │  8. POST /update-half-life (behavioralScore)
 │                          │                          ├───────────────────────▶│                   │
 │                          │                          │  9. { new_half_life }  │                   │
 │                          │                          │◀───────────────────────┤                   │
 │                          │                          │  10. Save Assessment + Update MemoryState  │
 │                          │                          ├──────────────────────────────────────────▶│
 │                          │  11. { behavioralScore, newHalfLife }             │                   │
 │                          │◀─────────────────────────┤                        │                   │
```

### 2.3 Dashboard Retention Computation

```
User                    React Client              Express Server          FastAPI / Local Fallback
 │                          │                          │                        │
 │  1. Open dashboard       │                          │                        │
 ├─────────────────────────▶│                          │                        │
 │                          │  2. GET /dashboard/:id/retention                  │
 │                          ├─────────────────────────▶│                        │
 │                          │                          │  3. Fetch Topic + MemoryState + Assessments
 │                          │                          │  4. hoursPassed = (now - lastCalc) / 3600000
 │                          │                          │  5. Try: POST /calculate-retention         │
 │                          │                          ├───────────────────────▶│                   │
 │                          │                          │     OR local fallback: │                   │
 │                          │                          │     R = M × 2^(-t/h)  │                   │
 │                          │                          │  6. Compute 7-day projection               │
 │                          │  7. { topic, M, h, currentRetention, assessments, projection }       │
 │                          │◀─────────────────────────┤                        │
 │                          │  8. Render Ebbinghaus curve + metrics             │
 │  9. Interactive chart    │                          │                        │
 │◀─────────────────────────┤                          │                        │
```

---

## 3. Frontend Architecture

### 3.1 Component Hierarchy

```
<AuthProvider>                          ← JWT state management
  <BrowserRouter>
    <Routes>
      /login          → <LoginPage />
      /register       → <RegisterPage />
      /               → <ProtectedRoute> → <HomePage />
                            ├── <SystemStatus />          ← Health polling
                            └── Priority Review alerts
      /skills/:id/topics → <ProtectedRoute> → <SkillDetailPage />
                            ├── <RetentionGraph />        ← Recharts
                            ├── Interview Readiness bar
                            └── Test-Before-Add modal
      /dashboard/:id  → <ProtectedRoute> → <DashboardPage />
                            ├── 5 metric cards
                            ├── Professional Readiness
                            ├── Ebbinghaus curve (Recharts)
                            └── Assessment history
      /quiz/:id       → <ProtectedRoute> → <QuizPage />
                            ├── MCQ selection
                            ├── Confidence slider
                            └── Latency tracking
      /topics/:id/analytics → <ProtectedRoute> → <TopicAnalyticsPage />
                            ├── <RetentionGraph />
                            └── RECALL NOW alert
    </Routes>
  </BrowserRouter>
</AuthProvider>
```

### 3.2 State Management

| State | Location | Persistence |
|-------|----------|-------------|
| Auth (user, token) | `AuthContext` | `localStorage` (`recall_token`) |
| Dashboard data | Component state (`useState`) | Per-mount (refetched on navigation) |
| Quiz answers, latency, confidence | Component state | Per-session (lost on unmount) |
| System health | `SystemStatus` component | Polled every 30s |

### 3.3 API Client Architecture

```javascript
// Centralized Axios instance with JWT interceptor
const API = axios.create({ baseURL: "http://localhost:5000/api" });
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("recall_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

All API functions are co-located in `services/api.js` — grouped by domain (Auth, Skills, Topics, Quiz, Dashboard, Health).

---

## 4. Backend Architecture

### 4.1 Express Middleware Stack

```
Request → CORS → JSON Parser → Morgan Logger → Route Matcher
  ├── /api/auth/*       → (open)
  ├── /api/health/*     → (open)
  └── /api/skills/*     ┐
      /api/topics/*     ├→ protect middleware (JWT verify → req.user)
      /api/quiz/*       │    → Controller → Response
      /api/dashboard/*  ┘
                     → errorHandler (catch-all)
```

### 4.2 Controller Pattern

Each controller follows the pattern:
1. **Validate** request parameters and user ownership
2. **Query** MongoDB via Mongoose models
3. **Proxy** to AI Engine when needed (with timeout + fallback)
4. **Transform** response into frontend-expected shape
5. **Respond** with `{ success: boolean, data: object }`

### 4.3 Cascade Delete Strategy

```
deleteSkill(id)
  └─▶ Find all Topics for skill
       └─▶ Delete all Assessments for those topics
       └─▶ Delete all MemoryStates for those topics
       └─▶ Delete all Topics
       └─▶ Delete the Skill

deleteTopic(id)
  └─▶ Delete MemoryState for user+topic
  └─▶ Delete all Assessments for user+topic
  └─▶ Delete the Topic
```

---

## 5. AI Engine Architecture

### 5.1 FastAPI Service Design

```python
FastAPI App
├── GET  /                          # Health check
├── POST /generate-questions        # Gemini MCQ generation (Pydantic validated)
├── POST /generate-flashcards       # Gemini flashcard generation
├── POST /update-half-life          # HLR multiplier computation
├── POST /calculate-retention       # R(t) = M × 2^(-t/h)
└── POST /calculate-projection      # 7-day retention forecast
```

### 5.2 Gemini Integration

```
Request → Prompt Engineering → Gemini 1.5 Flash API → Raw Text
  → Regex strip markdown fences → JSON.parse → Pydantic validation
  → Response (or fallback to mock questions on any failure)
```

**Prompt Engineering Strategy**:
- Random seed injected per request to prevent question repetition
- Explicit diversity requirements: recall, understanding, application, analysis, evaluation
- Strict JSON-only output rules — no markdown, no explanations
- 4-option constraint with plausible distractors

### 5.3 HLR Multiplier Engine

The half-life update uses a lookup table:

```python
if score >= 4.5: multiplier = 2.5    # Strong reinforcement
elif score >= 4.0: multiplier = 2.0  # Good reinforcement
elif score >= 3.0: multiplier = 1.5  # Moderate reinforcement
elif score >= 2.0: multiplier = 1.0  # No change
elif score >= 1.0: multiplier = 0.6  # Decay acceleration
else: multiplier = 0.3              # Severe decay

new_h = clamp(h × multiplier, 1.0, 8760.0)
```

---

## 6. Data Model (MongoDB)

### Entity-Relationship Diagram

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│   User   │──1:N─▶│  Skill   │──1:N─▶│  Topic   │
│          │       │          │       │          │
│ name     │       │ name     │       │ name     │
│ email    │       │ category │       │ description
│ password │       │ user(FK) │       │ category │
└──────────┘       └──────────┘       │ skill(FK)│
     │                                │ user(FK) │
     │                                └────┬─────┘
     │                                     │
     │              ┌──────────────┐       │       ┌──────────────┐
     └──────1:N────▶│ MemoryState  │◀──1:1─┘──1:N─▶│  Assessment  │
                    │              │                │              │
                    │ M (strength) │                │ score        │
                    │ h (halfLife) │                │ answers[]    │
                    │ lastCalc     │                │ user(FK)     │
                    │ user(FK)     │                │ topic(FK)    │
                    │ topic(FK)    │                └──────────────┘
                    └──────────────┘
```

### Indexes

| Collection | Index | Type | Purpose |
|------------|-------|------|---------|
| User | `{ email: 1 }` | Unique | Login lookup |
| Skill | `{ user: 1, name: 1 }` | Unique compound | Prevent duplicate skills per user |
| Topic | `{ user: 1, name: 1 }` | Unique compound | Prevent duplicate topics per user |
| MemoryState | `{ user: 1, topic: 1 }` | Unique compound | One state per user-topic pair |

---

## 7. Memory Retention Engine

### 7.1 Core Formula

$$R(t) = M \times 2^{-t/h}$$

This is the **Ebbinghaus Forgetting Curve** expressed as exponential decay with base 2, where the half-life $h$ directly represents the time for retention to drop to 50% of $M$.

### 7.2 Implementation Locations

The retention formula is implemented in **three places** for resilience:

| Location | File | Purpose |
|----------|------|---------|
| **Python AI Engine** | `ai-engine/main.py` | Canonical computation (`/calculate-retention`) |
| **Node.js Controller** | `server/src/controllers/dashboardController.js` | Local fallback (`localRetention()`) |
| **React Client** | `client/src/pages/HomePage.jsx`, `SkillDetailPage.jsx`, `DashboardPage.jsx` | Real-time client-side display |

All three implementations produce **mathematically identical results** with the same NaN/Infinity guards and clamping logic.

### 7.3 Behavioral Score Pipeline

```
Quiz Answers
    │
    ├── correctScore = (correct / total) × 5 × 0.6
    ├── latencyScore = max(0, (30 - avgLatency) / 30) × 5 × 0.2
    └── confidenceScore = (avgConfidence / 5) × 5 × 0.2
                │
                ▼
    behavioralScore = correctScore + latencyScore + confidenceScore
                │
                ▼
    POST /update-half-life { score: behavioralScore, current_half_life: h }
                │
                ▼
    new_h = h × multiplier(behavioralScore)
    new_h = clamp(new_h, 1, 8760)
```

---

## 8. Authentication Flow

```
┌──────────────────────────────────────────────────────────┐
│                   Registration Flow                       │
│                                                          │
│  Client: POST /api/auth/register { name, email, pass }   │
│       ▼                                                  │
│  Server: Hash password (bcrypt, 10 rounds)               │
│       ▼                                                  │
│  Server: Create User document                            │
│       ▼                                                  │
│  Server: Sign JWT { id: user._id } with JWT_SECRET       │
│       ▼                                                  │
│  Client: Store token in localStorage("recall_token")     │
│       ▼                                                  │
│  Client: AuthContext.setUser(userData)                    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                    Request Auth Flow                      │
│                                                          │
│  Client: Axios interceptor adds Authorization header     │
│       ▼                                                  │
│  Server: protect() middleware extracts Bearer token       │
│       ▼                                                  │
│  Server: jwt.verify(token, JWT_SECRET) → decoded.id      │
│       ▼                                                  │
│  Server: User.findById(decoded.id).select("-password")   │
│       ▼                                                  │
│  Server: req.user = user → next()                        │
│       ▼                                                  │
│  Controller: Access req.user._id for ownership checks    │
└──────────────────────────────────────────────────────────┘
```

---

## 9. API Contract Specification

### Response Envelope

All API responses follow:
```json
{
  "success": true | false,
  "data": { ... } | null,
  "message": "Error description" // only on failure
}
```

### Endpoint Summary

| Method | Endpoint | Auth | Controller | AI Proxy |
|--------|----------|------|------------|----------|
| POST | `/api/auth/register` | No | Inline | No |
| POST | `/api/auth/login` | No | Inline | No |
| GET | `/api/auth/me` | Yes | Inline | No |
| GET | `/api/skills` | Yes | `skillController.getSkills` | No |
| POST | `/api/skills` | Yes | `skillController.createSkill` | No |
| DELETE | `/api/skills/:id` | Yes | `skillController.deleteSkill` | No |
| GET | `/api/topics` | Yes | `topicController.getTopics` | No |
| POST | `/api/topics` | Yes | `topicController.createTopic` | No |
| DELETE | `/api/topics/:id` | Yes | `topicController.deleteTopic` | No |
| POST | `/api/quiz/entry-test` | Yes | `quizController.entryTest` | **Yes** |
| POST | `/api/quiz/entry-test/submit` | Yes | `quizController.submitEntryTest` | **Yes** |
| GET | `/api/quiz/:id/questions` | Yes | `quizController.getQuestions` | **Yes** |
| POST | `/api/quiz/:id/results` | Yes | `quizController.processResults` | **Yes** |
| GET | `/api/quiz/:id/flashcards` | Yes | `quizController.getFlashcards` | **Yes** |
| GET | `/api/dashboard/:id/retention` | Yes | `dashboardController.getTopicRetention` | **Yes** (fallback) |
| GET | `/api/health` | No | Inline | No |
| GET | `/api/health/ai-engine` | No | Inline | **Yes** |

---

## 10. Resilience & Failover Strategy

### AI Engine Unavailability

| Component | Behavior When AI Engine is Down |
|-----------|-------------------------------|
| Question Generation | Returns mock questions (functional but generic) |
| Retention Calculation | Local JS math — identical formula: `R = M × 2^(-t/h)` |
| Projection Curves | Local JS — 7-day decay from current retention |
| Half-Life Update | Quiz submission will fail (requires AI Engine) |
| System Status | Red dot indicator; UI remains fully functional |

### Timeout Configuration

| Operation | Timeout | Rationale |
|-----------|---------|-----------|
| Retention calculation | 5s | Math-only, should be instant |
| Question generation | 30s | Gemini response time varies |
| Health check | 3s | Non-critical polling |
| Half-life update | 10s | Critical but simple computation |

### Data Integrity

- **MongoDB Replica Set** ensures data durability
- **Unique compound indexes** prevent duplicate data
- **Cascade deletes** maintain referential integrity without foreign key constraints
- **Mongoose ODM** provides schema validation at the application layer

---

## 11. Security Architecture

```
┌─────────────────────────────────────────┐
│              Security Layers            │
├─────────────────────────────────────────┤
│  Transport:  CORS whitelist (5173)      │
│  Auth:       JWT Bearer tokens          │
│  Password:   bcrypt (10 salt rounds)    │
│  Query:      Mongoose ODM (no raw SQL)  │
│  Secrets:    .env files (.gitignored)   │
│  Validation: Pydantic (AI), Express (BE)│
│  Ownership:  req.user._id on all CRUD   │
└─────────────────────────────────────────┘
```

**Key Security Invariants**:
1. Every database query filters by `user: req.user._id` — users cannot access other users' data
2. Password field has `select: false` — never returned in any API response
3. JWT tokens are verified on every protected request
4. CORS restricts access to the known frontend origin

---

## 12. Performance Architecture

### Client-Side Optimizations

| Strategy | Implementation |
|----------|---------------|
| **Vite HMR** | Instant development rebuilds |
| **Client-side retention math** | Avoids API round-trips for real-time display |
| **Recharts animation** | GPU-accelerated SVG transitions |
| **Lazy data fetching** | Dashboard data fetched per-topic, not all-at-once |
| **Debounced health checks** | SystemStatus polls every 30s, not on every render |

### Server-Side Optimizations

| Strategy | Implementation |
|----------|---------------|
| **Parallel API calls** | `Promise.all` for concurrent AI Engine requests |
| **Lean queries** | `.lean()` for read-only assessment history |
| **Indexed queries** | Compound indexes on all frequent access patterns |
| **Local math fallback** | Sub-millisecond retention computation when AI is down |
| **Connection pooling** | Mongoose default connection pool for MongoDB |

### AI Engine Optimizations

| Strategy | Implementation |
|----------|---------------|
| **Gemini 1.5 Flash** | Fastest Gemini model variant |
| **Temperature 0.8** | Balanced creativity/consistency |
| **Regex pre-processing** | Strip markdown fences before JSON parse |
| **Mock fallback** | Instant response when API key is absent |

---

> **Architecture Status**: Production-ready for expo demonstration  
> **Last Updated**: 2026-05-11
