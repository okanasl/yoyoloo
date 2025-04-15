-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "state" JSONB,
    "messages" JSONB
);

-- CreateTable
CREATE TABLE "project_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "state" JSONB,
    "type" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "description" TEXT NOT NULL
);
