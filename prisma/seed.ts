import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();

  await prisma.quizStatus.upsert({
    where: { id: 1 },
    update: {},
    create: {
      is_active: false,
      round: null,
      remaining_time: null,
    },
  });

  await prisma.quizSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      round_time_interval: 10,
    },
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
