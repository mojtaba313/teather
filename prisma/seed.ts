import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const username = "admin"
  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    console.log("Admin user already exists:", username)
    return
  }

  const hashed = await bcrypt.hash("admin123", 12)
  const user = await prisma.user.create({
    data: {
      name: "مدیر سیستم",
      username,
      password: hashed,
    },
  })
  console.log("Admin user created:", user.username, "/ password: admin123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
