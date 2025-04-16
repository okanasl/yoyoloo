-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" JSONB,
    "messages" JSONB,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_assets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" JSONB,
    "type" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "project_assets_pkey" PRIMARY KEY ("id")
);
