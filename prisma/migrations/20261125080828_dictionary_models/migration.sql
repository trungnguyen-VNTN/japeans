/*
  Warnings:

  - You are about to drop the column `tatoebaId` on the `Example` table. All the data in the column will be lost.
  - The primary key for the `KanjiComponent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `childId` on the `KanjiComponent` table. All the data in the column will be lost.
  - You are about to drop the column `parentId` on the `KanjiComponent` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Sense` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `frequency` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `jmdictId` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `WordKanjiForm` table. All the data in the column will be lost.
  - Added the required column `kanjiId` to the `KanjiComponent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `radicalId` to the `KanjiComponent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `display` to the `Radical` table without a default value. This is not possible if the table is not empty.
  - Added the required column `form` to the `WordExample` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senseOrder` to the `WordExample` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order` to the `WordKanjiForm` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order` to the `WordReading` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "KanjiComponent" DROP CONSTRAINT "KanjiComponent_childId_fkey";

-- DropForeignKey
ALTER TABLE "KanjiComponent" DROP CONSTRAINT "KanjiComponent_parentId_fkey";

-- DropIndex
DROP INDEX "Example_tatoebaId_key";

-- DropIndex
DROP INDEX "Kanji_jlptLevel_idx";

-- DropIndex
DROP INDEX "Word_jmdictId_key";

-- AlterTable
ALTER TABLE "Example" DROP COLUMN "tatoebaId",
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Example_id_seq";

-- AlterTable
ALTER TABLE "Kanji" ADD COLUMN     "jlptOld" INTEGER,
ADD COLUMN     "kangxiRadical" INTEGER,
ADD COLUMN     "nanori" TEXT[],
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Kanji_id_seq";

-- AlterTable
ALTER TABLE "KanjiComponent" DROP CONSTRAINT "KanjiComponent_pkey",
DROP COLUMN "childId",
DROP COLUMN "parentId",
ADD COLUMN     "kanjiId" INTEGER NOT NULL,
ADD COLUMN     "radicalId" INTEGER NOT NULL,
ADD CONSTRAINT "KanjiComponent_pkey" PRIMARY KEY ("kanjiId", "radicalId");

-- AlterTable
ALTER TABLE "Radical" ADD COLUMN     "display" TEXT NOT NULL,
ADD COLUMN     "meaningEn" TEXT,
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Radical_id_seq";

-- AlterTable
ALTER TABLE "Sense" DROP COLUMN "notes",
ADD COLUMN     "antonyms" TEXT[],
ADD COLUMN     "fields" TEXT[],
ADD COLUMN     "info" TEXT[],
ADD COLUMN     "misc" TEXT[],
ADD COLUMN     "related" TEXT[];

-- AlterTable
ALTER TABLE "Word" DROP COLUMN "createdAt",
DROP COLUMN "frequency",
DROP COLUMN "jmdictId",
DROP COLUMN "updatedAt",
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Word_id_seq";

-- AlterTable
ALTER TABLE "WordExample" ADD COLUMN     "form" TEXT NOT NULL,
ADD COLUMN     "senseOrder" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "WordKanjiForm" DROP COLUMN "priority",
ADD COLUMN     "isCommon" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "order" INTEGER NOT NULL,
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "WordReading" ADD COLUMN     "appliesToKanji" TEXT[],
ADD COLUMN     "isCommon" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "order" INTEGER NOT NULL,
ADD COLUMN     "tags" TEXT[];

-- CreateIndex
CREATE INDEX "Kanji_jlptOld_idx" ON "Kanji"("jlptOld");

-- CreateIndex
CREATE INDEX "Kanji_grade_idx" ON "Kanji"("grade");

-- CreateIndex
CREATE INDEX "Kanji_frequency_idx" ON "Kanji"("frequency");

-- CreateIndex
CREATE INDEX "KanjiComponent_radicalId_idx" ON "KanjiComponent"("radicalId");

-- CreateIndex
CREATE INDEX "Sense_wordId_idx" ON "Sense"("wordId");

-- CreateIndex
CREATE INDEX "WordExample_exampleId_idx" ON "WordExample"("exampleId");

-- CreateIndex
CREATE INDEX "WordKanjiForm_wordId_idx" ON "WordKanjiForm"("wordId");

-- CreateIndex
CREATE INDEX "WordReading_wordId_idx" ON "WordReading"("wordId");

-- AddForeignKey
ALTER TABLE "KanjiComponent" ADD CONSTRAINT "KanjiComponent_kanjiId_fkey" FOREIGN KEY ("kanjiId") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiComponent" ADD CONSTRAINT "KanjiComponent_radicalId_fkey" FOREIGN KEY ("radicalId") REFERENCES "Radical"("id") ON DELETE CASCADE ON UPDATE CASCADE;
