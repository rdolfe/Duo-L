import { FastifyInstance } from "fastify";
import { CEFR_ORDER } from "../lib/gamification.js";
import { userStats } from "./auth.js";

// Le contenu envoyé au client ne contient jamais les réponses attendues
// (sauf quand elles font partie de l'énoncé : Listen&Repeat, Roleplay, lecture).
function clientContent(type: string, raw: string) {
  const c = JSON.parse(raw);
  switch (type) {
    case "TRANSLATE_SPEAK":
      return { textFr: c.textFr };
    case "LISTEN_REPEAT":
      return { textEn: c.textEn, hintFr: c.hintFr };
    case "ROLEPLAY":
      return { contextFr: c.contextFr, npcName: c.npcName, npcLine: c.npcLine, choices: c.choices };
    case "READ_ALOUD":
      return { paragraphEn: c.paragraphEn };
    case "MULTIPLE_CHOICE":
      return { prompt: c.prompt, options: c.options, hintFr: c.hintFr };
    case "FILL_BLANK":
      return { sentence: c.sentence, hintFr: c.hintFr };
    case "WRITE_TRANSLATION":
      return { textFr: c.textFr };
    case "LISTEN_TYPE":
      // textEn est nécessaire au client pour la synthèse vocale ; l'UI ne l'affiche pas.
      return { textEn: c.textEn };
    default:
      return {};
  }
}

export async function contentRoutes(app: FastifyInstance) {
  // Carte des unités/leçons avec état (verrouillée, débloquée, terminée).
  app.get("/api/units", { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const units = await app.prisma.unit.findMany({
      include: {
        lessons: {
          orderBy: { sortOrder: "asc" },
          include: { progress: { where: { userId } }, exercises: { select: { id: true } } },
        },
      },
    });
    units.sort(
      (a, b) => CEFR_ORDER.indexOf(a.cefrLevel) - CEFR_ORDER.indexOf(b.cefrLevel) || a.sortOrder - b.sortOrder
    );

    let previousCompleted = true; // la toute première leçon est débloquée
    return units.map((u) => ({
      id: u.id,
      cefrLevel: u.cefrLevel,
      title: u.title,
      description: u.description,
      lessons: u.lessons.map((l) => {
        const done = l.progress.some((p) => p.completedAt);
        const status = done ? "COMPLETED" : previousCompleted ? "UNLOCKED" : "LOCKED";
        previousCompleted = done;
        return {
          id: l.id,
          title: l.title,
          xpReward: l.xpReward,
          exerciseCount: l.exercises.length,
          status,
          bestScore: l.progress[0]?.bestScore ?? null,
        };
      }),
    }));
  });

  app.get("/api/lessons/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as any;
    const lesson = await app.prisma.lesson.findUnique({
      where: { id },
      include: { unit: true, exercises: { orderBy: { sortOrder: "asc" } } },
    });
    if (!lesson) return reply.code(404).send({ error: "Leçon introuvable." });
    return {
      id: lesson.id,
      title: lesson.title,
      xpReward: lesson.xpReward,
      unit: { title: lesson.unit.title, cefrLevel: lesson.unit.cefrLevel },
      exercises: lesson.exercises.map((e) => ({
        id: e.id,
        type: e.type,
        minScore: e.minScore,
        content: clientContent(e.type, e.content),
      })),
    };
  });

  app.get("/api/dashboard", { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const [stats, badges, owned, recent] = await Promise.all([
      userStats(app, userId),
      app.prisma.badge.findMany(),
      app.prisma.userBadge.findMany({ where: { userId } }),
      app.prisma.exerciseAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { exercise: { include: { lesson: true } } },
      }),
    ]);
    const ownedIds = new Set(owned.map((b) => b.badgeId));
    return {
      stats,
      badges: badges.map((b) => ({
        slug: b.slug, titleFr: b.titleFr, descriptionFr: b.descriptionFr, icon: b.icon,
        earned: ownedIds.has(b.id),
      })),
      history: recent.map((a) => ({
        id: a.id,
        lessonTitle: a.exercise.lesson.title,
        type: a.exercise.type,
        score: a.score,
        passed: a.passed,
        createdAt: a.createdAt,
      })),
    };
  });
}
