-- AlterTable
-- A NOT NULL column cannot be added to a table that already has rows, so the
-- column is added as nullable, filled for the existing patients, and only then
-- made NOT NULL.
ALTER TABLE "patients" ADD COLUMN "search_text" TEXT;

-- Same rule as normalizeForSearch in server/src/lib/search.ts: lowercase and
-- without accents, so "Ana Núñez" becomes "ana nunez".
UPDATE "patients"
SET "search_text" = translate(
  lower("first_name" || ' ' || "last_name"),
  'áàäâéèëêíìïîóòöôúùüûñç',
  'aaaaeeeeiiiioooouuuunc'
);

ALTER TABLE "patients" ALTER COLUMN "search_text" SET NOT NULL;
