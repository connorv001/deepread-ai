# DeepRead AI - Intelligent Reading Companion

Transform passive reading into an active, AI-enhanced learning experience.

## Features

- 📚 **Document Support**: Read PDF and EPUB files seamlessly
- 🤖 **AI Summarization**: Get instant summaries powered by GPT-4/Claude
- 🔊 **Text-to-Audio**: Listen to content with ElevenLabs TTS
- 🔍 **Deep Dive**: Explore concepts with contextual information
- 📖 **Split-Pane Interface**: Resizable reading and AI assistant panes
- 🔐 **User Authentication**: Secure JWT-based auth with progress sync

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Zustand (State Management)
- TanStack Query

### Backend
- Express.js
- PostgreSQL
- Redis
- MinIO (S3-compatible storage)
- BullMQ (Job Queue)

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm or pnpm

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd deepread-ai
```

2. Install dependencies:
```bash
npm install
```

3. Start Docker services:
```bash
npm run docker:up
```

4. Set up environment variables:
```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

5. Start development servers:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- MinIO Console: http://localhost:9001

## Environment Variables

### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `OPENAI_API_KEY`: OpenAI API key
- `ELEVENLABS_API_KEY`: ElevenLabs API key
- `JWT_SECRET`: Secret for JWT tokens
- `MINIO_ENDPOINT`: MinIO endpoint
- `MINIO_ACCESS_KEY`: MinIO access key
- `MINIO_SECRET_KEY`: MinIO secret key

### Frontend
- `NEXT_PUBLIC_API_URL`: Backend API URL

## Project Structure

```
deepread-ai/
├── frontend/           # Next.js application
│   ├── app/           # App router pages
│   ├── components/    # React components
│   ├── lib/          # Utilities and hooks
│   └── public/       # Static assets
├── backend/           # Express API
│   ├── src/
│   │   ├── routes/   # API routes
│   │   ├── services/ # Business logic
│   │   ├── models/   # Database models
│   │   └── utils/    # Utilities
│   └── prisma/       # Database schema
└── docker-compose.yml # Development services
```

## License

MIT
