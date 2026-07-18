import { FastifyInstance } from "fastify";
import { CEFR_ORDER, unlockedLevelSet } from "../lib/gamification.js";
import { userStats } from "./auth.js";

// Nombre d'exercices servis par session de leçon (tirés au hasard dans le pool).
const SERVE_SIZE = 8;

// Mélange (Fisher-Yates) : la bonne réponse d'un QCM ne doit pas toujours
// occuper la même position. Le scoring compare le TEXTE de la réponse, jamais
// sa position, donc mélanger à chaque envoi est sans risque.
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
      return { contextFr: c.contextFr, npcName: c.npcName, npcLine: c.npcLine, choices: shuffled(c.choices) };
    case "READ_ALOUD":
      return { paragraphEn: c.paragraphEn };
    case "MULTIPLE_CHOICE":
      return { prompt: c.prompt, options: shuffled(c.options), hintFr: c.hintFr };
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
    const [units, exams, courses, unlocked] = await Promise.all([
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
      app.prisma.course.findMany({ orderBy: { sortOrder: "asc" } }),
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
            // On affiche ce qu'une session sert réellement, pas la taille du pool.
            exerciseCount: Math.min(SERVE_SIZE, l.exercises.length),
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

      // Cours théoriques du niveau : toujours lisibles, même niveau verrouillé
      // (lire la théorie ne rapporte ni XP ni progression).
      const outCourses = courses
        .filter((c) => c.cefrLevel === level)
        .map((c) => {
          const parsed = JSON.parse(c.content);
          return { id: c.id, title: c.title, emoji: parsed.emoji ?? "📖", intro: parsed.intro ?? "" };
        });

      return { cefrLevel: level, unlocked: levelUnlocked, units: outUnits, exam: examOut, courses: outCourses };
    });
  });

  // Contenu complet d'un cours théorique.
  app.get("/api/courses/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as any;
    const course = await app.prisma.course.findUnique({ where: { id } });
    if (!course) return reply.code(404).send({ error: "Cours introuvable." });
    const parsed = JSON.parse(course.content);
    return {
      id: course.id,
      cefrLevel: course.cefrLevel,
      title: course.title,
      emoji: parsed.emoji ?? "📖",
      intro: parsed.intro ?? "",
      sections: parsed.sections ?? [],
    };
  });

  app.get("/api/lessons/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub;
    const { id } = req.params as any;
    const lesson = await app.prisma.lesson.findUnique({
      where: { id },
      include: { unit: true, exercises: { orderBy: { sortOrder: "asc" } } },
    });
    if (!lesson) return reply.code(404).send({ error: "Leçon introuvable." });

    const progress = await app.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: id } },
    });

    // Chaque session pioche SERVE_SIZE exercices au hasard dans le pool de la
    // leçon : refaire une leçon ne retombe pas sur les mêmes questions. Le
    // tirage est mémorisé (currentServing) — la fin de leçon ne validera que
    // ces exercices-là.
    let served = lesson.exercises;
    if (served.length > SERVE_SIZE) {
      served = shuffled(served).slice(0, SERVE_SIZE);
      // Première fois : on garde l'ordre pédagogique (types groupés).
      served.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    // Leçon déjà terminée : ordre aléatoire pour varier les reprises.
    if (progress?.completedAt) served = shuffled(served);

    const servingJson = JSON.stringify(served.map((e) => e.id));
    await app.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: id } },
      create: { userId, lessonId: id, currentServing: servingJson },
      update: { currentServing: servingJson },
    });

    return {
      id: lesson.id,
      title: lesson.title,
      xpReward: lesson.xpReward,
      unit: { title: lesson.unit.title, cefrLevel: lesson.unit.cefrLevel },
      exercises: served.map((e) => ({
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
    // Déjà tenté ? Ordre aléatoire des questions pour varier les reprises.
    const retake = (exam.results[0]?.attempts ?? 0) > 0;
    const examExercises = retake ? shuffled(exam.exercises) : exam.exercises;
    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      cefrLevel: exam.cefrLevel,
      xpReward: exam.xpReward,
      passScore: exam.passScore,
      bestOn20: exam.results[0] ? Math.round(exam.results[0].bestScore / 5) : null,
      passed: exam.results[0]?.passed ?? false,
      exercises: examExercises.map((e) => ({
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
