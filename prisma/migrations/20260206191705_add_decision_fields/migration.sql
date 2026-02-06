/*
  Warnings:

  - You are about to drop the column `final_rationale` on the `decisions` table. All the data in the column will be lost.
  - You are about to drop the column `participants` on the `decisions` table. All the data in the column will be lost.
  - You are about to drop the `decision_options` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `final_decision` to the `decisions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rationale` to the `decisions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `decisions` table without a default value. This is not possible if the table is not empty.
  - Made the column `problem_statement` on table `decisions` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "decision_options" DROP CONSTRAINT "decision_options_decision_id_fkey";

-- AlterTable
ALTER TABLE "decisions" DROP COLUMN "final_rationale",
DROP COLUMN "participants",
ADD COLUMN     "action_items" TEXT[],
ADD COLUMN     "final_decision" TEXT NOT NULL,
ADD COLUMN     "options_discussed" TEXT[],
ADD COLUMN     "rationale" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "problem_statement" SET NOT NULL,
ALTER COLUMN "source" SET DEFAULT 'meet';

-- DropTable
DROP TABLE "decision_options";
