# HelloGuard Voice AI — Frontend

Next.js dashboard and voice interface for the HelloGuard Voice AI platform. Provides role-based analytics dashboards, real-time voice calling via LiveKit, and admin controls.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| UI | React 19, Tailwind CSS 4, Radix UI |
| Voice / WebRTC | LiveKit Client 2.17 |
| Charts | Recharts 3 |
| Animation | Framer Motion 12 |
| HTTP | Axios |
| Icons | Lucide React |
| Date Utilities | date-fns |

---

## Project Structure

```
gard-react-frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main platform (role-based dashboard routing)
│   │   ├── login/page.tsx      # Login
│   │   ├── register/page.tsx   # Registration
│   │   └── pending/page.tsx    # Awaiting admin approval
│   ├── views/                  # Full-page dashboard views
│   │   ├── GlobalDashboard.tsx            # Overview KPIs and call summary
│   │   ├── LiveVoiceTerminal.tsx          # Voice call UI with transcription
│   │   ├── VoiceAgentDashboard.tsx        # Call performance analytics
│   │   ├── KnowledgeDashboard.tsx         # RAG and knowledge base metrics
│   │   ├── FleetDashboard.tsx             # Robot fleet status
│   │   ├── ClientEngagementDashboard.tsx  # Per-product engagement metrics
│   │   ├── CustomerMetrics.tsx            # Customer sentiment analytics
│   │   ├── CustomerProfiles.tsx           # Customer database and call history
│   │   ├── CalendarDashboard.tsx          # Monthly call activity heatmap
│   │   ├── UserManagement.tsx             # Admin user controls
│   │   └── SecurityCenterDashboard.tsx    # Priority event feed
│   ├── components/
│   │   ├── Sidebar.tsx                    # Navigation sidebar
│   │   └── CalendarRangePicker.tsx        # Date range picker component
│   ├── hooks/
│   │   ├── useLiveKitVoice.ts   # LiveKit room, audio, transcription
│   │   └── useVoiceAgent.ts     # Agent interaction state
│   └── lib/
│       ├── api.ts               # Axios client with JWT interceptors
│       ├── auth.ts              # Token and user storage helpers
│       ├── audioUtils.ts        # Audio encoding/decoding utilities
│       ├── utils.ts             # General utilities
│       └── CONSTS.ts            # API base URL
├── public/
├── package.json
├── tailwind.config.mjs
└── tsconfig.json
```

---

## Setup

### 1. Install dependencies

```bash
cd gard-react-frontend
npm install
```

### 2. Configure environment

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_AGENT_ID=your_lyzr_agent_id
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | URL of the FastAPI backend |
| `NEXT_PUBLIC_AGENT_ID` | Lyzr agent ID used for chat interactions |

### 3. Run the dev server

```bash
npm run dev
```

App runs at `http://localhost:3000`.

---

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Username + password login |
| `/register` | New user registration (requires admin approval) |
| `/pending` | Shown while account awaits approval |
| `/` | Main platform — role-based tab navigation |

---

## Dashboard Views

Access is gated by role. **Operators** can only access the Live Voice Terminal. **Admins** have full access to all views.

### Overview (Global Dashboard)
Aggregated KPI cards — total calls, FCR rate, containment rate, CSAT. Includes call trend charts, recent calls list, and active escalations summary. Supports global product filter (SP50, W3, V3, K5, Yarbo).

### Live Voice Terminal
Start and end voice sessions with the GARD AI agent over LiveKit WebRTC. Displays real-time transcription (agent and caller turns) with a live session timer and post-call summary trigger.

### Performance (Voice Agent Dashboard)
Call volume over time, topic distribution, sentiment analysis, outcome breakdown (resolved / escalated / partial / abandoned), and agent performance metrics.

### Knowledge (Knowledge Dashboard)
RAG (Retrieval-Augmented Generation) metrics — KB confidence scores, citation rates, document usage heatmap, and top cited knowledge base documents.

### Fleet
Live robot fleet status across all models (online / offline / error). Includes battery levels, last-seen timestamps, and per-model maintenance schedules.

### Engagement (Client Engagement Dashboard)
Per-product engagement metrics — interaction volume, resolution rate, sentiment trends, and call outcome breakdown filtered by robot model.

### Calendar
Monthly call activity heatmap. Click any day to see individual calls, outcomes, and escalation flags. Supports "Escalated Only" and "Sales Leads" filters.

### Customer Metrics
Aggregated customer behavior analytics — sentiment trends over time, CSAT distribution, and satisfaction score tracking.

### Customers (Customer Profiles)
Searchable customer database. Select any customer to see their profile, robot fleet, full call history, and interaction patterns.

### Users (Admin only)
User management table — approve/reject pending registrations, toggle admin/operator roles, suspend or reactivate accounts.

### Security Center
Real-time priority event feed — escalations, sales leads detected, anomalies. Events are color-coded by severity (info / warning / critical).

---

## Authentication

- JWT token stored in `localStorage`
- Axios interceptor attaches `Authorization: Bearer <token>` to every request
- On 401 response: token cleared, user redirected to `/login`
- Status-based redirects on login:
  - `pending` → `/pending`
  - `suspended` → `/login` with error
  - `active` → `/`

---

## Voice Calling Flow

1. User clicks **Start Call** → frontend calls `POST /session/start`
2. Backend returns LiveKit URL and token
3. `useLiveKitVoice` connects the browser mic to the LiveKit room
4. LiveKit `TranscriptionReceived` events stream transcript turns in real time
5. User clicks **End Call** → transcript array sent to `POST /session/end`
6. Backend stores transcript and auto-triggers post-call analysis

---

## Role Reference

| Role | Live Voice | All Dashboards | User Management |
|------|-----------|----------------|-----------------|
| Operator | ✅ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ |
