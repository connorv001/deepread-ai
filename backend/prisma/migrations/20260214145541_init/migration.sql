-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PDF', 'EPUB');

-- CreateEnum
CREATE TYPE "SummaryType" AS ENUM ('FULL', 'SELECTION', 'CHAPTER');

-- CreateEnum
CREATE TYPE "AIRequestType" AS ENUM ('SUMMARIZE', 'DEEP_DIVE', 'CHAT');

-- CreateEnum
CREATE TYPE "AudioJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "fontSize" INTEGER NOT NULL DEFAULT 16,
    "aiModel" TEXT NOT NULL DEFAULT 'gpt-4',
    "ttsVoice" TEXT NOT NULL DEFAULT 'default',
    "paneRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "thumbnailKey" TEXT,
    "type" "DocumentType" NOT NULL,
    "pageCount" INTEGER,
    "metadata" JSONB,
    "currentPage" INTEGER NOT NULL DEFAULT 1,
    "currentChapter" INTEGER NOT NULL DEFAULT 0,
    "scrollPosition" INTEGER NOT NULL DEFAULT 0,
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "summaries" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "type" "SummaryType" NOT NULL,
    "content" TEXT NOT NULL,
    "pageStart" INTEGER,
    "pageEnd" INTEGER,
    "chapterIndex" INTEGER,
    "aiModel" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AIRequestType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "latencyMs" INTEGER,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_jobs" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AudioJobStatus" NOT NULL DEFAULT 'PENDING',
    "textContent" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "storageKey" TEXT,
    "duration" INTEGER,
    "pageStart" INTEGER,
    "pageEnd" INTEGER,
    "chapterIndex" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "audio_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "documents_storageKey_key" ON "documents"("storageKey");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_jobs" ADD CONSTRAINT "audio_jobs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_jobs" ADD CONSTRAINT "audio_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
