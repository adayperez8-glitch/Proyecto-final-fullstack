-- AlterTable: cómo renderizar imageUrl en una historia ("IMAGE" | "VIDEO").
-- null = imagen (compatibilidad con historias antiguas).
ALTER TABLE "Story" ADD COLUMN "mediaType" TEXT;
