import { FastifyInstance } from "fastify";
import { scoreAgainstCandidates } from "../lib/scoring.js";
import { refreshHearts, nextStreak, todayKey, checkBadges } from "../lib/gamification.js";
import { userStats } from "./auth.js";

// Réponses attendues selon le type d'exercice (côté serveur uniquement).
function expectedAnswers(type: string, raw: string): string[] {
  const c = JSON.parse(raw);
  switch (type) {
    case "LISTEN_REPEAT": return [c.textEn];
    case "TRANSLATE_SPEAK": return c.accepted;
    case "ROLEPLAY": return c.choices;
    case "READ_ALOUD": return [c.paragraphEn];
    case "MULTIPLE_CHOICE": return [c.answer];
    case "FILL_BLANK": return [c.answer, ...(c.alternatives ?? [])];
    case "WRITE_TRANSLATION": return c.accepted;
    case "LISTEN_TYPE": return [c.textEn];
    default: return [];
  }
}

// Réponse « modèle » à révéler quand l'utilisateur ne sait pas.
function revealAnswer(type: string, raw: string): string {
  const c = JSON.parse(raw);
  switch (type) {
    case "LISTEN_REPEAT": return c.textEn;
    case "TRANSLATE_SPEAK": return c.accepted[0];
    case "ROLEPLAY": return c.choices[0];
    case "READ_ALOUD": return c.paragraphEn;
    case "MULTIPLE_CHOICE": return c.answer;
    case "FILL_BLANK": return c.answer;
    case "WRITE_TRANSLATION": return c.accepted[0];
    case "LISTEN_TYPE": return c.textEn;
    default: return "";
  }
}

// Normalisation tolérante aux accents pour la comparaison exacte des QCM
// (les options peuvent être en français).
function normalizeExact(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function attemptRoutes(app: FastifyInstance) {
  // Le client envoie la transcription ; le serveur calcule le score et applique
  // les règles de gamification (source de vérité : jamais le client).
  app.post("/api/attempts", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub;
    const { exerciseId, transcript } = (req.body ?? {}) as any;
    if (!exerciseId || typeof transcript !== "string") {
      return reply.code(400).send({ error: "exerciseId et transcript requis." });
    }
    const exercise = await app.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) return reply.code(404).send({ error: "Exercice introuvable." });

    let user = await app.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    user = await refreshHearts(app.prisma, user);
    if (user.hearts <= 0) {
      return reply.code(403).send({ error: "Plus de vies ! Reviens plus tard." });
    }

    // QCM : comparaison exacte (une option est bonne ou mauvaise, pas de score partiel).
    let result;
    if (exercise.type === "MULTIPLE_CHOICE") {
      const answer = expectedAnswers(exercise.type, exercise.content)[0];
      const correct = normalizeExact(transcript) === normalizeExact(answer);
      result = { score: correct ? 100 : 0, wordScores: [], matched: answer };
    } else {
      result = scoreAgainstCandidates(expectedAnswers(exercise.type, exercise.content), transcript);
    }
    const passed = result.score >= exercise.minScore;

    if (!passed) {
      user = await app.prisma.user.update({
        where: { id: userId },
        data: {
          hearts: user.hearts - 1,
          // démarre le chrono de régénération si on quitte le max
          heartsUpdatedAt: user.hearts === 5 ? new Date() : user.heartsUpdatedAt,
        },
      });
    }

    await app.prisma.exerciseAttempt.create({
      data: {
        userId, exerciseId,
        transcript: transcript.slice(0, 1000),
        score: result.score,
        wordScores: JSON.stringify(result.wordScores),
        passed,
      },
    });

    return {
      score: result.score,
      passed,
      wordScores: result.wordScores,
      expected: result.matched,
      hearts: user.hearts,
    };
  });

  // « Je ne sais pas » : révèle la réponse modèle au prix d'un cœur.
  app.post("/api/exercises/:id/reveal", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub;
    const { id } = req.params as any;
    const exercise = await app.prisma.exercise.findUnique({ where: { id } });
    if (!exercise) return reply.code(404).send({ error: "Exercice introuvable." });

    let user = await app.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    user = await refreshHearts(app.prisma, user);
    if (user.hearts <= 0) {
      return reply.code(403).send({ error: "Plus de vies ! Reviens plus tard." });
    }
    user = await app.prisma.user.update({
      where: { id: userId },
      data: {
        hearts: user.hearts - 1,
        heartsUpdatedAt: user.hearts === 5 ? new Date() : user.heartsUpdatedAt,
      },
    });

    return { answer: revealAnswer(exercise.type, exercise.content), hearts: user.hearts };
  });

  // Fin de leçon : le serveur vérifie que chaque exercice a été réussi,
  // puis attribue XP, série et badges.
  app.post("/api/lessons/:id/complete", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.sub;
    const { id } = req.params as any;
    const lesson = await app.prisma.lesson.findUnique({
      where: { id },
      include: { exercises: true },
    });
    if (!lesson) return reply.code(404).send({ error: "Leçon introuvable." });

    const scores: number[] = [];
    for (const ex of lesson.exercises) {
      const best = await app.prisma.exerciseAttempt.findFirst({
        where: { userId, exerciseId: ex.id, passed: true },
        orderBy: { score: "desc" },
      });
      if (!best) return reply.code(400).send({ error: "Tous les exercices ne sont pas réussis." });
      scores.push(best.score);
    }
    const bestScore = Math.round(scores.reduce((s, x) => s + x, 0) / scores.length);
    const perfect = scores.every((s) => s >= 90);

    const already = await app.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: id } },
    });
    const firstCompletion = !already?.completedAt;

    await app.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: id } },
      create: { userId, lessonId: id, bestScore, completedAt: new Date() },
      update: { bestScore: Math.max(bestScore, already?.bestScore ?? 0), completedAt: already?.completedAt ?? new Date() },
    });

    // XP : plein tarif à la première réussite, réduit ensuite ; bonus sans-faute.
    let xp = firstCompletion ? lesson.xpReward : 5;
    if (perfect && firstCompletion) xp += 5;

    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const streak = nextStreak(user);
    await app.prisma.user.update({
      where: { id: userId },
      data: {
        totalXp: user.totalXp + xp,
        currentStreak: streak,
        longestStreak: Math.max(streak, user.longestStreak),
        lastActiveDay: todayKey(),
      },
    });
    await app.prisma.xpEvent.create({
      data: { userId, amount: xp, reason: firstCompletion ? "lesson_completed" : "lesson_practice" },
    });

    const newBadges = await checkBadges(app.prisma, userId, { perfectLesson: perfect });

    return {
      xpGained: xp,
      perfect,
      bestScore,
      newBadges,
      stats: await userStats(app, userId),
    };
  });
}
