-- CreateEnum
CREATE TYPE "AIContentType" AS ENUM ('KANJI_MNEMONIC', 'KANJI_EXPLANATION', 'WORD_USAGE', 'WORD_COMPARISON');

-- CreateEnum
CREATE TYPE "AIContentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('LEARNER', 'TEACHER', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "StudyMode" AS ENUM ('FLASHCARD', 'LEARN', 'WRITE', 'DICTATION', 'HANDWRITING', 'TEST', 'MATCH', 'SRS_REVIEW');

-- CreateTable
CREATE TABLE "Word" (
    "id" SERIAL NOT NULL,
    "jmdictId" INTEGER,
    "jlptLevel" INTEGER,
    "isCommon" BOOLEAN NOT NULL DEFAULT false,
    "frequency" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordKanjiForm" (
    "id" SERIAL NOT NULL,
    "wordId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "priority" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WordKanjiForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordReading" (
    "id" SERIAL NOT NULL,
    "wordId" INTEGER NOT NULL,
    "kana" TEXT NOT NULL,
    "romaji" TEXT NOT NULL,
    "pitch" TEXT,

    CONSTRAINT "WordReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sense" (
    "id" SERIAL NOT NULL,
    "wordId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "partsOfSpeech" TEXT[],
    "glossEn" TEXT[],
    "glossVi" TEXT[],
    "viReviewed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "Sense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Example" (
    "id" SERIAL NOT NULL,
    "tatoebaId" INTEGER,
    "textJa" TEXT NOT NULL,
    "furigana" TEXT,
    "textVi" TEXT,
    "textEn" TEXT,
    "difficulty" INTEGER,

    CONSTRAINT "Example_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordExample" (
    "wordId" INTEGER NOT NULL,
    "exampleId" INTEGER NOT NULL,

    CONSTRAINT "WordExample_pkey" PRIMARY KEY ("wordId","exampleId")
);

-- CreateTable
CREATE TABLE "Kanji" (
    "id" SERIAL NOT NULL,
    "character" TEXT NOT NULL,
    "onReadings" TEXT[],
    "kunReadings" TEXT[],
    "hanViet" TEXT[],
    "meaningsEn" TEXT[],
    "meaningsVi" TEXT[],
    "strokeCount" INTEGER NOT NULL,
    "jlptLevel" INTEGER,
    "grade" INTEGER,
    "frequency" INTEGER,
    "strokeSvg" TEXT,
    "radicalId" INTEGER,

    CONSTRAINT "Kanji_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Radical" (
    "id" SERIAL NOT NULL,
    "kangxiNo" INTEGER,
    "character" TEXT NOT NULL,
    "nameVi" TEXT,
    "hanViet" TEXT,
    "meaningVi" TEXT,
    "strokeCount" INTEGER NOT NULL,

    CONSTRAINT "Radical_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanjiComponent" (
    "parentId" INTEGER NOT NULL,
    "childId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "KanjiComponent_pkey" PRIMARY KEY ("parentId","childId")
);

-- CreateTable
CREATE TABLE "AIContent" (
    "id" SERIAL NOT NULL,
    "type" "AIContentType" NOT NULL,
    "targetKey" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "AIContentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "aiContentId" INTEGER,
    "studySetId" TEXT,
    "reason" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'LEARNER',
    "dailyGoal" INTEGER NOT NULL DEFAULT 20,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySet" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "tags" TEXT[],
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "cloneOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudySet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetCard" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "term" TEXT NOT NULL,
    "reading" TEXT,
    "definition" TEXT NOT NULL,
    "imageUrl" TEXT,
    "audioUrl" TEXT,
    "wordId" INTEGER,

    CONSTRAINT "SetCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolderSet" (
    "folderId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,

    CONSTRAINT "FolderSet_pkey" PRIMARY KEY ("folderId","setId")
);

-- CreateTable
CREATE TABLE "CardProgress" (
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "inSrs" BOOLEAN NOT NULL DEFAULT false,
    "state" INTEGER NOT NULL DEFAULT 0,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "due" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReview" TIMESTAMP(3),

    CONSTRAINT "CardProgress_pkey" PRIMARY KEY ("userId","cardId")
);

-- CreateTable
CREATE TABLE "ReviewLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "mode" "StudyMode" NOT NULL,
    "rating" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "elapsedMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "mode" "StudyMode" NOT NULL,
    "score" INTEGER,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Word_jmdictId_key" ON "Word"("jmdictId");

-- CreateIndex
CREATE INDEX "Word_jlptLevel_idx" ON "Word"("jlptLevel");

-- CreateIndex
CREATE INDEX "WordKanjiForm_text_idx" ON "WordKanjiForm"("text");

-- CreateIndex
CREATE INDEX "WordReading_kana_idx" ON "WordReading"("kana");

-- CreateIndex
CREATE INDEX "WordReading_romaji_idx" ON "WordReading"("romaji");

-- CreateIndex
CREATE UNIQUE INDEX "Example_tatoebaId_key" ON "Example"("tatoebaId");

-- CreateIndex
CREATE UNIQUE INDEX "Kanji_character_key" ON "Kanji"("character");

-- CreateIndex
CREATE INDEX "Kanji_jlptLevel_idx" ON "Kanji"("jlptLevel");

-- CreateIndex
CREATE UNIQUE INDEX "Radical_kangxiNo_key" ON "Radical"("kangxiNo");

-- CreateIndex
CREATE UNIQUE INDEX "Radical_character_key" ON "Radical"("character");

-- CreateIndex
CREATE UNIQUE INDEX "AIContent_type_targetKey_key" ON "AIContent"("type", "targetKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "StudySet_visibility_idx" ON "StudySet"("visibility");

-- CreateIndex
CREATE INDEX "SetCard_setId_order_idx" ON "SetCard"("setId", "order");

-- CreateIndex
CREATE INDEX "CardProgress_userId_due_idx" ON "CardProgress"("userId", "due");

-- CreateIndex
CREATE INDEX "ReviewLog_userId_createdAt_idx" ON "ReviewLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "WordKanjiForm" ADD CONSTRAINT "WordKanjiForm_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordReading" ADD CONSTRAINT "WordReading_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sense" ADD CONSTRAINT "Sense_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordExample" ADD CONSTRAINT "WordExample_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordExample" ADD CONSTRAINT "WordExample_exampleId_fkey" FOREIGN KEY ("exampleId") REFERENCES "Example"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kanji" ADD CONSTRAINT "Kanji_radicalId_fkey" FOREIGN KEY ("radicalId") REFERENCES "Radical"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiComponent" ADD CONSTRAINT "KanjiComponent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiComponent" ADD CONSTRAINT "KanjiComponent_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_aiContentId_fkey" FOREIGN KEY ("aiContentId") REFERENCES "AIContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_studySetId_fkey" FOREIGN KEY ("studySetId") REFERENCES "StudySet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySet" ADD CONSTRAINT "StudySet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySet" ADD CONSTRAINT "StudySet_cloneOfId_fkey" FOREIGN KEY ("cloneOfId") REFERENCES "StudySet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetCard" ADD CONSTRAINT "SetCard_setId_fkey" FOREIGN KEY ("setId") REFERENCES "StudySet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetCard" ADD CONSTRAINT "SetCard_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderSet" ADD CONSTRAINT "FolderSet_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderSet" ADD CONSTRAINT "FolderSet_setId_fkey" FOREIGN KEY ("setId") REFERENCES "StudySet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardProgress" ADD CONSTRAINT "CardProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardProgress" ADD CONSTRAINT "CardProgress_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "SetCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "SetCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_setId_fkey" FOREIGN KEY ("setId") REFERENCES "StudySet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
