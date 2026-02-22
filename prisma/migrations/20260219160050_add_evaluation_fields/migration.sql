-- AlterTable
ALTER TABLE "decisions" ADD COLUMN     "embedding_synced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feedback_note" TEXT,
ADD COLUMN     "user_rating" INTEGER,
ADD COLUMN     "verified_correct" BOOLEAN;

-- CreateIndex
CREATE INDEX "decisions_embedding_synced_idx" ON "decisions"("embedding_synced");
