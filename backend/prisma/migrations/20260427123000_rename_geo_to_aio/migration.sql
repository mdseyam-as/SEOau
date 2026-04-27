ALTER TABLE "History" ALTER COLUMN "mode" SET DEFAULT 'aio';
ALTER TABLE "Plan" RENAME COLUMN "canUseGeoMode" TO "canUseAioMode";
ALTER TABLE "SystemSetting" RENAME COLUMN "geoPrompt" TO "aioPrompt";
