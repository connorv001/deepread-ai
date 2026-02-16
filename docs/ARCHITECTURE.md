# DeepRead AI - Architecture Document

## Overview

DeepRead AI is an AI-powered reading application with PDF/EPUB rendering, real-time AI summarization, audio generation (TTS), contextual deep-dives, and document chat functionality.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 14)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Reader    │  │   Library   │  │    Auth (BFF Pattern)   │  │
│  │  PDFViewer  │  │  Document   │  │   httpOnly Cookies      │  │
│  │ EPUBViewer  │  │   Upload    │  │   No localStorage       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Backend (Express + TypeScript)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    Auth     │  │  Documents  │  │      AI Service         │  │
│  │   Routes    │  │   Routes    │  │  OpenRouter + Gemini    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Storage   │  │  Processor  │  │      Rate Limiter       │  │
│  │   MinIO     │  │  PDF/EPUB   │  │        Redis            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Data Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  PostgreSQL │  │    MinIO    │  │         Redis           │  │
│  │   (Prisma)  │  │  (Storage)  │  │   (Cache/Sessions)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI:** shadcn/ui + Tailwind CSS
- **State:** Zustand
- **Data Fetching:** TanStack Query
- **PDF Rendering:** react-pdf (pdf.js wrapper) ⚠️ IN PROGRESS
- **EPUB Rendering:** epub.js ⚠️ IN PROGRESS

### Backend
- **Runtime:** Node.js + Express
- **Language:** TypeScript
- **ORM:** Prisma
- **Validation:** Zod
- **Logging:** Winston
- **Authentication:** JWT with httpOnly cookies (BFF pattern)

### AI Integration
- **Provider:** OpenRouter
- **Model:** Gemini 3 Flash (google/gemini-2.0-flash-001)
- **Features:**
  - Document summarization
  - Deep-dive concept exploration
  - Document chat
  - Audio generation (TTS)

### Infrastructure
- **Database:** PostgreSQL
- **Object Storage:** MinIO
- **Cache:** Redis
- **Deployment:** Cloudflare Tunnel (deepreader.shubham.wtf)

## Key Architectural Decisions

### ADR-001: BFF Pattern for Authentication
**Status:** Accepted
**Context:** Need secure auth that prevents XSS token theft
**Decision:** Use Backend-for-Frontend pattern with httpOnly cookies
**Consequences:** 
- Tokens never exposed to JavaScript
- Frontend uses Next.js API routes as proxy
- More complex but more secure

### ADR-002: Document Proxy for CORS
**Status:** Accepted
**Context:** MinIO presigned URLs may cause CORS issues
**Decision:** Create `/api/documents/:id/content` proxy endpoint
**Consequences:**
- Documents served through our backend
- Full control over caching headers
- Slight latency increase

### ADR-003: AI Provider via OpenRouter
**Status:** Accepted
**Context:** Need flexible AI provider with cost control
**Decision:** Use OpenRouter with Gemini 3 Flash
**Consequences:**
- Easy model switching
- Usage tracking
- Cost optimization (Gemini is cheap)

### ADR-004: PDF/EPUB Rendering Libraries
**Status:** In Progress
**Context:** Need proper document rendering with text selection
**Decision:** Use react-pdf for PDFs and epub.js for EPUBs
**Previous:** Used basic iframes (not suitable for production)
**New:** 
- react-pdf: Proper PDF rendering with zoom, page nav
- epub.js: Chapter navigation, themes, text selection

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login (sets httpOnly cookie)
- `POST /api/auth/logout` - Logout (clears cookie)
- `GET /api/auth/profile` - Get current user

### Documents
- `GET /api/documents` - List user's documents
- `POST /api/documents` - Upload document
- `GET /api/documents/:id` - Get document metadata
- `GET /api/documents/:id/content` - Proxy document content
- `POST /api/documents/:id/extract` - Extract text from document
- `GET /api/documents/:id/text` - Get extracted text/chunks

### AI
- `POST /api/ai/summarize` - Summarize text
- `POST /api/ai/deep-dive` - Deep dive into concepts
- `POST /api/ai/chat` - Chat about document
- `POST /api/ai/audio` - Generate audio (TTS)

### Health
- `GET /health` - Backend health check

## Security Considerations

1. **Authentication:** httpOnly cookies, no localStorage
2. **Authorization:** JWT validation middleware
3. **Rate Limiting:** Redis-based per-user limits
4. **Input Validation:** Zod schemas
5. **File Upload:** Type validation, size limits
6. **CORS:** Configured for frontend origin only

## Monitoring

- **Real-time:** Send alerts to Telegram (NOT Teams)
- **Health Checks:** `/health` endpoint
- **Logging:** Winston with structured logs

## Deployment

- **URL:** https://deepreader.shubham.wtf
- **Tunnel:** Cloudflare named tunnel
- **Backend:** Port 3001
- **Frontend:** Port 3000

---

*Last Updated: 2026-02-16*
*Status: Active Development*
