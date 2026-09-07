/*
  Warnings:

  - The primary key for the `Monitor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `Monitor` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Monitor` table. All the data in the column will be lost.
  - The `status` column on the `Monitor` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "MonitorStatus" AS ENUM ('UP', 'DEGRADED', 'DOWN');

-- AlterTable
ALTER TABLE "Monitor" DROP CONSTRAINT "Monitor_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "MonitorStatus" NOT NULL DEFAULT 'UP',
ADD CONSTRAINT "Monitor_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Monitor_id_seq";
