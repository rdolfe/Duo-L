import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { refreshHearts, CEFR_ORDER } from "../lib/gamification.js";

export async function userStats(app: FastifyInstance, userId: string) {
  let user = await app.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  user = await refreshHearts(app.prisma, user);

  // Niveau CECRL atteint = plus haut niveau avec au moins une leçon terminée.
  const completed = await app.prisma.lessonProgress.findMany({
    where: { userId, completedAt: { not: null } },
    include: { lesson: { include: { unit: true } } },
  });
  let cefrLevel = "A1";
  for (const p of completed) {
    const lvl = p.lesson.unit.cefrLevel;
    if (CEFR_ORDER.indexOf(lvl) > CEFR_ORDER.indexOf(cefrLevel)) cefrLevel = lvl;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    totalXp: user.totalXp,
    hearts: user.hearts,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    lastActiveDay: user.lastActiveDay,
    cefrLevel,
    lessonsCompleted: completed.length,
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", async (req, reply) => {
    const { email, password, displayName } = (req.body ?? {}) as any;
    if (!email || !password || !displayName) {
      return reply.code(400).send({ error: "Email, mot de passe et pseudo requis." });
    }
    if (String(password).length < 6) {
      return reply.code(400).send({ error: "Le mot de passe doit faire au moins 6 caractères." });
    }
    const existing = await app.prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (existing) return reply.code(409).send({ error: "Un compte existe déjà avec cet email." });

    const user = await app.prisma.user.create({
      data: {
        email: String(email).toLowerCase(),
        displayName: String(displayName),
        passwordHash: await bcrypt.hash(String(password), 10),
      },
    });
    const token = app.jwt.sign({ sub: user.id }, { expiresIn: "30d" });
    return { token, user: await userStats(app, user.id) };
  });

  app.post("/api/auth/login", async (req, reply) => {
    const { email, password } = (req.body ?? {}) as any;
    const user = await app.prisma.user.findUnique({ where: { email: String(email ?? "").toLowerCase() } });
    if (!user || !(await bcrypt.compare(String(password ?? ""), user.passwordHash))) {
      return reply.code(401).send({ error: "Email ou mot de passe incorrect." });
    }
    const token = app.jwt.sign({ sub: user.id }, { expiresIn: "30d" });
    return { token, user: await userStats(app, user.id) };
  });

  app.get("/api/me", { preHandler: [app.authenticate] }, async (req) => {
    return userStats(app, req.user.sub);
  });
}
