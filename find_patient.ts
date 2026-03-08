import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const patient = await prisma.patient.findFirst()
  console.log(JSON.stringify(patient))
}
main()
