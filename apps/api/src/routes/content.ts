import { FastifyInstance } from "fastify";
import { CEFR_ORDER, unlockedLevelSet } from "../lib/gamification.js";
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
  // Parcours complet groupé par niveau CECRL, avec état de chaque leçon et de
  // l'examen de fin de niveau (verrouillé / ouvert / terminé).
  app.get("/api/path", { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;
    const [units, exams, unlocked] = await Promise.all([
      app.prisma.unit.findMany({
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            include: { progress: { where: { userId } }, exercises: { select: { id: true } } },
          },
        },
      }),
      app.prisma.exam.findMany({
        include: { exercises: { select: { id: true } }, results: { where: { userId } } },
      }),
      unlockedLevelSet(app.prisma, userId),
    ]);

    units.sort(
      (a, b) => CEFR_ORDER.indexOf(a.cefrLevel) - CEFR_ORDER.indexOf(b.cefrLevel) || a.sortOrder - b.sortOrder
    );
    const examByLevel = new Map(exams.map((e) => [e.cefrLevel, e]));

    // Regroupe les unités par niveau, en conservant l'ordre CECRL.
    const levelOrder: string[] = [];
    const unitsByLevel = new Map<string, typeof units>();
    for (const u of units) {
      if (!unitsByLevel.has(u.cefrLevel)) {
        unitsByLevel.set(u.cefrLevel, []);
        levelOrder.push(u.cefrLevel);
      }
      unitsByLevel.get(u.cefrLevel)!.push(u);
    }

    return levelOrder.map((level) => {
      const levelUnits = unitsByLevel.get(level)!;
      const levelUnlocked = unlocked.has(level);

      // Déblocage séquentiel des leçons À L'INTÉRIEUR du niveau.
      let previousCompleted = true;
      const outUnits = levelUnits.map((u) => ({
        id: u.id,
        cefrLevel: u.cefrLevel,
        title: u.title,
        description: u.description,
        lessons: u.lessons.map((l) => {
          const done = l.progress.some((p) => p.completedAt);
          let status: "LOCKED" | "UNLOCKED" | "COMPLETED";
          if (!levelUnlocked) status = "LOCKED";
          else status = done ? "COMPLETED" : previousCompleted ? "UNLOCKED" : "LOCKED";
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

      const allLessons = levelUnits.flatMap((u) => u.lessons);
      const allDone = allLessons.length > 0 && allLessons.every((l) => l.progress.some((p) => p.completedAt));

      const exam = examByLevel.get(level);
      let examOut = null;
      if (exam) {
        const res = exam.results[0];
        const passed = res?.passed ?? false;
        const status: "LOCKED" | "UNLOCKED" | "PASSED" = passed
          ? "PASSED"
          : levelUnlocked && allDone
            ? "UNLOCKED"
            : "LOCKED";
        examOut = {
          id: exam.id,
          title: exam.title,
          description: exam.description,
          exerciseCount: exam.exercises.length,
          xpReward: exam.xpReward,
          passScore: exam.passScore,
          status,
          bestScore: res?.bestScore ?? null,
          bestOn20: res ? Math.round(res.bestScore / 5) : null,
        };
      }

      return { cefrLevel: level, unlocked: levelUnlocked, units: outUnits, exam: examOut };
    });
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

  // Examen de fin de niveau : liste des questions (sans les réponses).
  app.get("/api/exams/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub;
    const { id } = req.params as any;
    const exam = await app.prisma.exam.findUnique({
      where: { id },
      include: { exercises: { orderBy: { sortOrder: "asc" } }, results: { where: { userId } } },
    });
    if (!exam) return reply.code(404).send({ error: "Examen introuvable." });
    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      cefrLevel: exam.cefrLevel,
      xpReward: exam.xpReward,
      passScore: exam.passScore,
      bestOn20: exam.results[0] ? Math.round(exam.results[0].bestScore / 5) : null,
      passed: exam.results[0]?.passed ?? false,
      exercises: exam.exercises.map((e) => ({
        id: e.id,
        type: e.type,
        minScore: e.minScore,
        content: clientContent(e.type, e.content),
      })),
    };
  });

  // Code de déblocage : « jailelevelA1 », « jailelevelB2 », etc.
  // Entrer le code d'un niveau marque comme réussis les examens de tous les
  // niveaux jusqu'à celui-ci (inclus), ce qui débloque ce niveau (et le suivant).
  const UNLOCK_CODES: Record<string, string> = Object.fromEntries(
    CEFR_ORDER.map((lvl) => [`jailelevel${lvl}`.toLowerCase(), lvl])
  );
  app.post("/api/unlock", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub;
    const { code } = (req.body ?? {}) as any;
    const level = UNLOCK_CODES[String(code ?? "").trim().toLowerCase()];
    if (!level) return reply.code(400).send({ error: "Code invalide." });

    const idx = CEFR_ORDER.indexOf(level);
    const levels = CEFR_ORDER.slice(0, idx + 1);
    const exams = await app.prisma.exam.findMany({ where: { cefrLevel: { in: levels } } });
    if (exams.length === 0) {
      return reply.code(409).send({ error: "Les tests de niveau ne sont pas encore chargés côté serveur." });
    }
    for (const exam of exams) {
      const prev = await app.prisma.examResult.findUnique({
        where: { userId_examId: { userId, examId: exam.id } },
      });
      await app.prisma.examResult.upsert({
        where: { userId_examId: { userId, examId: exam.id } },
        create: {
          userId, examId: exam.id,
          bestScore: Math.max(prev?.bestScore ?? 0, exam.passScore),
          passed: true,
          attempts: prev?.attempts ?? 0,
          completedAt: new Date(),
        },
        update: {
          passed: true,
          bestScore: Math.max(prev?.bestScore ?? 0, exam.passScore),
          completedAt: prev?.completedAt ?? new Date(),
        },
      });
    }
    return { unlockedLevel: level, stats: await userStats(app, userId) };
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
        lessonTitle: a.exercise.lesson?.title ?? "Test de niveau",
        type: a.exercise.type,
        score: a.score,
        passed: a.passed,
        createdAt: a.createdAt,
      })),
    };
  });
}
