-- CreateTable
CREATE TABLE "QuizSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "round_time_interval" INTEGER NOT NULL DEFAULT 10,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QuizStatus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "round" INTEGER,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "QuizStatus_round_fkey" FOREIGN KEY ("round") REFERENCES "Question" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "image_url" TEXT
);

-- CreateTable
CREATE TABLE "Option" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "image_url" TEXT,
    "is_correct" BOOLEAN NOT NULL,
    "question_id" INTEGER NOT NULL,
    CONSTRAINT "Option_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nickname" TEXT,
    "class_id" INTEGER,
    CONSTRAINT "Student_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "SchoolClass" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchoolClass" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "_OptionToStudent" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_OptionToStudent_A_fkey" FOREIGN KEY ("A") REFERENCES "Option" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_OptionToStudent_B_fkey" FOREIGN KEY ("B") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_name_key" ON "SchoolClass"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_OptionToStudent_AB_unique" ON "_OptionToStudent"("A", "B");

-- CreateIndex
CREATE INDEX "_OptionToStudent_B_index" ON "_OptionToStudent"("B");
