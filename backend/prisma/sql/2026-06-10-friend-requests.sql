-- Solicitudes de amistad (FriendRequest).
-- Esta BD se actualiza con SQL directo (no migrate dev / db push: ver nota en
-- el README del backend — el ai-service tiene tablas propias fuera de Prisma
-- y los comandos de migración intentarían borrarlas).
--
-- Aplicar en local:      npx prisma db execute --file prisma/sql/2026-06-10-friend-requests.sql
-- Aplicar en producción: igual, con DATABASE_URL apuntando a Neon.
-- El SQL es idempotente: se puede ejecutar dos veces sin romper nada.

CREATE TABLE IF NOT EXISTS "FriendRequest" (
  "id"        TEXT NOT NULL,
  "fromId"    TEXT NOT NULL,
  "toId"      TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FriendRequest_fromId_toId_key"
  ON "FriendRequest"("fromId", "toId");

CREATE INDEX IF NOT EXISTS "FriendRequest_toId_idx"
  ON "FriendRequest"("toId");

DO $$
BEGIN
  ALTER TABLE "FriendRequest"
    ADD CONSTRAINT "FriendRequest_fromId_fkey"
    FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "FriendRequest"
    ADD CONSTRAINT "FriendRequest_toId_fkey"
    FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
