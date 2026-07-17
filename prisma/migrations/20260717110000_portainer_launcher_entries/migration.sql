-- CreateTable
CREATE TABLE "LauncherEntry" (
    "id" TEXT NOT NULL,
    "providerServiceId" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "discoveredName" TEXT NOT NULL,
    "image" TEXT,
    "inferredLaunchUrl" TEXT,
    "containerState" TEXT NOT NULL DEFAULT 'unknown',
    "containerStatus" TEXT,
    "lastStatus" TEXT NOT NULL DEFAULT 'unknown',
    "exposedPorts" JSONB NOT NULL DEFAULT '[]',
    "nameOverride" TEXT,
    "launchUrlOverride" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LauncherEntry_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ServiceInstance"
  ADD COLUMN "pollFailureCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextPollAt" TIMESTAMP(3),
  ADD COLUMN "lastLauncherDiscoveryAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "LauncherEntry_providerServiceId_containerId_key" ON "LauncherEntry"("providerServiceId", "containerId");
CREATE INDEX "LauncherEntry_providerServiceId_hidden_idx" ON "LauncherEntry"("providerServiceId", "hidden");
CREATE INDEX "LauncherEntry_lastSeenAt_idx" ON "LauncherEntry"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "LauncherEntry" ADD CONSTRAINT "LauncherEntry_providerServiceId_fkey" FOREIGN KEY ("providerServiceId") REFERENCES "ServiceInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
