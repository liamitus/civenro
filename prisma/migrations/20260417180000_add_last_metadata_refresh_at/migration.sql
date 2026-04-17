-- Track when refresh-bill-metadata last touched a bill, so the cron can
-- skip bills already-refreshed-recently whose CRS summary Congress.gov
-- simply hasn't published yet. Without this the WHERE clause keeps
-- re-fetching ~12k bills forever, crowding out genuinely-untouched ones.
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "lastMetadataRefreshAt" TIMESTAMP(3);
