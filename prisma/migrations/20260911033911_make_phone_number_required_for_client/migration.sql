/*
  Warnings:

  - Made the column `phone_number` on table `Client` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "phone_number" SET NOT NULL;
