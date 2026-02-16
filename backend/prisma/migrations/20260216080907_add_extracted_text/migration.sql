-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "chunks" JSONB,
ADD COLUMN     "extractedText" TEXT;
