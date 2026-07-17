import { PrismaClient, User } from "@prisma/client";

export const MAX_HEARTS = 5;
export const HEART_REFILL_MS = 7 * 1000; // délai après avoir perdu TOUTES ses vies

// On ne régénère les vies QUE lorsqu'elles sont toutes perdues (0). Le compte à
// rebours démarre à l'instant où la dernière vie est perdue (heartsUpdatedAt) ;
// une fois le délai écoulé, on refait le plein d'un coup. Tant qu'il reste au
// moins une vie, rien ne se régénère (sinon on ne « sent » jamais l'attente).
export async function refreshHearts(prisma: PrismaClient, user: User): Promise<User> {
  if (user.hearts > 0) return user;
  const elapsed = Date.now() - user.heartsUpdatedAt.getTime();
  if (elapsed < HEART_REFILL_MS) return user;
  return prisma.user.update({
    where: { id: user.id },
    data: { hearts: MAX_HEARTS, heartsUpdatedAt: new Date() },
  });
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

// Met à jour la série au moment où une leçon est terminée.
export function nextStreak(user: User): number {
  if (user.lastActiveDay === todayKey()) return user.currentStreak;
  if (user.lastActiveDay === yesterdayKey()) return user.currentStreak + 1;
  return 1;
}

// Ordre des niveaux CECRL.
export const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

// Niveaux CECRL débloqués pour un utilisateur.
// Règle : A1 est toujours ouvert ; un niveau s'ouvre quand l'examen du niveau
// précédent est réussi. Garde-fou de migration : un niveau où l'utilisateur a
// déjà terminé au moins une leçon reste ouvert (ne jamais reverrouiller un
// joueur existant lors de l'ajout des examens).
export async function unlockedLevelSet(prisma: PrismaClient, userId: string): Promise<Set<string>> {
  const [exams, progress] = await Promise.all([
    prisma.exam.findMany({
      select: { cefrLevel: true, results: { where: { userId }, select: { passed: true } } },
    }),
    prisma.lessonProgress.findMany({
      where: { userId, completedAt: { not: null } },
      select: { lesson: { select: { unit: { select: { cefrLevel: true } } } } },
    }),
  ]);
  const passedLevel = new Set(exams.filter((e) => e.results[0]?.passed).map((e) => e.cefrLevel));
  const startedLevel = new Set(progress.map((p) => p.lesson.unit.cefrLevel));

  const unlocked = new Set<string>();
  let previousPassed = true; // avant A1
  for (const lvl of CEFR_ORDER) {
    if (previousPassed || startedLevel.has(lvl)) unlocked.add(lvl);
    previousPassed = passedLevel.has(lvl);
  }
  return unlocked;
}

// Vérifie et attribue les badges manquants. Retourne les nouveaux badges.
export async function checkBadges(prisma: PrismaClient, userId: string, opts: { perfectLesson?: boolean } = {}) {
  const [user, lessonsCompleted, owned, badges] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.lessonProgress.count({ where: { userId, completedAt: { not: null } } }),
    prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
    prisma.badge.findMany(),
  ]);
  const ownedIds = new Set(owned.map((b) => b.badgeId));

  // Unités entièrement terminées
  const units = await prisma.unit.findMany({
    include: { lessons: { include: { progress: { where: { userId, completedAt: { not: null } } } } } },
  });
  const unitsCompleted = units.filter((u) => u.lessons.length > 0 && u.lessons.every((l) => l.progress.length > 0)).length;

  const newBadges = [];
  for (const b of badges) {
    if (ownedIds.has(b.id)) continue;
    let earned = false;
    switch (b.criteriaType) {
      case "LESSONS": earned = lessonsCompleted >= b.criteriaValue; break;
      case "STREAK": earned = user.currentStreak >= b.criteriaValue; break;
      case "XP": earned = user.totalXp >= b.criteriaValue; break;
      case "PERFECT": earned = !!opts.perfectLesson; break;
      case "UNITS": earned = unitsCompleted >= b.criteriaValue; break;
    }
    if (earned) {
      await prisma.userBadge.create({ data: { userId, badgeId: b.id } });
      newBadges.push({ slug: b.slug, titleFr: b.titleFr, descriptionFr: b.descriptionFr, icon: b.icon });
    }
  }
  return newBadges;
}
