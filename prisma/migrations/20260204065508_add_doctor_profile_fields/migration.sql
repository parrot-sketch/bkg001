-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "consultation_fee" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN     "languages" TEXT,
ADD COLUMN     "years_of_experience" INTEGER DEFAULT 0;
