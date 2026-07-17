// Outil de dev : marque comme terminées toutes les leçons AVANT l'unité donnée,
// pour un utilisateur donné. Usage :
//   npx tsx scripts/dev-complete-until.ts test@duospeak.dev "Grammaire en action"
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

async function main() {
  const [email, unitTitle] = process.argv.slice(2);
  if (!email || !unitTitle) {
    console.error("Usage: tsx scripts/dev-complete-until.ts <email> <titre d'unité>");
    process.exit(1);
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const units = await prisma.unit.findMany({ include: { lessons: { orderBy: { sortOrder: "asc" } } } });
  units.sort(
    (a, b) => CEFR_ORDER.indexOf(a.cefrLevel) - CEFR_ORDER.indexOf(b.cefrLevel) || a.sortOrder - b.sortOrder
  );
  let count = 0;
  for (const u of units) {
    if (u.title === unitTitle) break;
    for (const l of u.lessons) {
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId: l.id } },
        create: { userId: user.id, lessonId: l.id, bestScore: 100, completedAt: new Date() },
        update: { completedAt: new Date() },
      });
      count++;
    }
  }
  console.log(`${count} leçons marquées terminées pour ${email} (jusqu'à « ${unitTitle} » exclu).`);
}

main().finally(() => prisma.$disconnect());
