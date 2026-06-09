import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.user.updateMany({
    where: { email: "octacm@gmail.com" },
    data: { isAdmin: true },
  })
  console.log(`Admin seed: updated ${result.count} user(s)`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
