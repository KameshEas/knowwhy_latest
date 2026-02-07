-- CreateTable
CREATE TABLE "slack_integrations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "team_id" TEXT NOT NULL,
    "team_name" TEXT NOT NULL,
    "user_slack_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sync_at" TIMESTAMP(3),

    CONSTRAINT "slack_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gitlab_integrations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "gitlab_url" TEXT NOT NULL DEFAULT 'https://gitlab.com',
    "username" TEXT NOT NULL,
    "user_gitlab_id" INTEGER,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sync_at" TIMESTAMP(3),

    CONSTRAINT "gitlab_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slack_integrations_user_id_key" ON "slack_integrations"("user_id");

-- CreateIndex
CREATE INDEX "slack_integrations_user_id_idx" ON "slack_integrations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "gitlab_integrations_user_id_key" ON "gitlab_integrations"("user_id");

-- CreateIndex
CREATE INDEX "gitlab_integrations_user_id_idx" ON "gitlab_integrations"("user_id");

-- AddForeignKey
ALTER TABLE "slack_integrations" ADD CONSTRAINT "slack_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gitlab_integrations" ADD CONSTRAINT "gitlab_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
