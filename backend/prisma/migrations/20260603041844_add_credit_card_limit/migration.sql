-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "credit_limit" DECIMAL(10,2),
ADD COLUMN     "invoice_paid" BOOLEAN NOT NULL DEFAULT true;
