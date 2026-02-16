# DeepRead AI 📚🤖

**Your Intelligent Reading Companion**

Transform your reading with AI-powered summaries, audio narration, and deep dives into any concept.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20.x-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)

## ✨ Features

- **📄 PDF & EPUB Support** - Upload and read documents in a clean, focused interface
- **🧠 AI Summarization** - Get instant summaries of selected text or entire documents using GPT-4/Claude
- **🎧 Text-to-Speech** - Convert any text to natural audio with ElevenLabs
- **🔍 Deep Dive** - Explore concepts, get definitions, and discover related references
- **📱 Split-Pane UI** - Read and interact with AI side-by-side
- **☁️ Cloud Sync** - Your library and progress synced across devices

## 🏗️ Architecture

```
deepread-ai/
├── backend/           # Express.js API server
│   ├── prisma/        # Database schema
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Business logic
│   │   ├── middleware/# Auth, error handling
│   │   └── utils/     # Helpers
│   └── package.json
├── frontend/          # Next.js 14 app
│   ├── app/           # App router pages
│   ├── components/    # React components
│   ├── lib/           # API client, stores
│   └── package.json
├── docs/              # API documentation
└── docker-compose.yml # Infrastructure
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- API Keys: OpenAI, ElevenLabs (optional: Anthropic)

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/connorv001/deepread-ai.git
   cd deepread-ai
   ```

2. **Start infrastructure**
   ```bash
   docker-compose up -d
   ```

3. **Setup backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your API keys
   npm install
   npx prisma migrate dev
   npm run dev
   ```

4. **Setup frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Open** http://localhost:3000

## 📖 API Documentation

See [docs/openapi.yaml](docs/openapi.yaml) for full API specification.

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/login` | POST | Login |
| `/api/documents/upload` | POST | Upload PDF/EPUB |
| `/api/ai/summarize` | POST | AI summarization |
| `/api/ai/deep-dive` | POST | Concept exploration |
| `/api/audio/generate` | POST | Text-to-speech |

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 20
- **Framework:** Express.js
- **Database:** PostgreSQL + Prisma ORM
- **Cache:** Redis
- **Storage:** MinIO (S3-compatible)
- **Queue:** BullMQ
- **WebSocket:** Socket.io

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand
- **Data:** TanStack Query

### AI Services
- **LLM:** OpenAI GPT-4 / Anthropic Claude
- **TTS:** ElevenLabs

## 🔧 Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379

# Storage (MinIO)
MINIO_ENDPOINT=localhost
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# AI APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...

# Auth
JWT_SECRET=your-secret
```

## 📝 Development

```bash
# Backend
cd backend
npm run dev        # Start dev server
npm run typecheck  # TypeScript check
npm run lint       # ESLint

# Frontend  
cd frontend
npm run dev        # Start dev server
npm run build      # Production build
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ by the DeepRead AI team
