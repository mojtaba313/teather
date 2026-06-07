-- AlterTable
ALTER TABLE "Script" ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_lockedByUserId_fkey" FOREIGN KEY ("lockedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
