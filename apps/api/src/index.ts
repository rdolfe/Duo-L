import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastifyStatic from "@fastify/static";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { authRoutes } from "./routes/auth.js";
import { contentRoutes } from "./routes/content.js";
import { attemptRoutes } from "./routes/attempts.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (req: any, reply: any) => Promise<void>;
  }
}
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

const app = Fastify({ logger: true });
const prisma = new PrismaClient();

await app.register(cors, { origin: true });
await app.register(jwt, { secret: process.env.JWT_SECRET ?? "duo-speak-dev-secret" });

app.decorate("prisma", prisma);
app.decorate("authenticate", async (req: any, reply: any) => {
  try {
    await req.jwtVerify();
  } catch {
    reply.code(401).send({ error: "Non authentifié" });
  }
});

app.get("/api/health", async () => ({ ok: true }));

await app.register(authRoutes);
await app.register(contentRoutes);
await app.register(attemptRoutes);

// En production, l'API sert aussi le frontend compilé (apps/web/dist) :
// un seul service à héberger.
const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/dist");
if (fs.existsSync(webDist)) {
  await app.register(fastifyStatic, { root: webDist });
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api")) {
      reply.code(404).send({ error: "Route introuvable." });
    } else {
      reply.sendFile("index.html");
    }
  });
}

const port = Number(process.env.PORT ?? 3001);
const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
