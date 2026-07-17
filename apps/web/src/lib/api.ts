// Client HTTP typé minimal. Le token JWT est conservé en localStorage.

export type UserStats = {
  id: string;
  email: string;
  displayName: string;
  totalXp: number;
  hearts: number;
  currentStreak: number;
  longestStreak: number;
  cefrLevel: string;
  lessonsCompleted: number;
};

export type LessonSummary = {
  id: string;
  title: string;
  xpReward: number;
  exerciseCount: number;
  status: "LOCKED" | "UNLOCKED" | "COMPLETED";
  bestScore: number | null;
};

export type UnitSummary = {
  id: string;
  cefrLevel: string;
  title: string;
  description: string;
  lessons: LessonSummary[];
};

export type ExerciseType =
  | "LISTEN_REPEAT"
  | "TRANSLATE_SPEAK"
  | "ROLEPLAY"
  | "READ_ALOUD"
  | "MULTIPLE_CHOICE"
  | "FILL_BLANK"
  | "WRITE_TRANSLATION"
  | "LISTEN_TYPE";

export type ExerciseDto = {
  id: string;
  type: ExerciseType;
  minScore: number;
  content: {
    textEn?: string;
    hintFr?: string;
    textFr?: string;
    contextFr?: string;
    npcName?: string;
    npcLine?: string;
    choices?: string[];
    paragraphEn?: string;
    prompt?: string;
    options?: string[];
    sentence?: string;
  };
};

export type LessonDto = {
  id: string;
  title: string;
  xpReward: number;
  unit: { title: string; cefrLevel: string };
  exercises: ExerciseDto[];
};

export type AttemptResult = {
  score: number;
  passed: boolean;
  wordScores: { word: string; score: number }[];
  expected: string;
  hearts: number;
};

export type Badge = { slug: string; titleFr: string; descriptionFr: string; icon: string; earned?: boolean };

export type CompleteResult = {
  xpGained: number;
  perfect: boolean;
  bestScore: number;
  newBadges: Badge[];
  stats: UserStats;
};

export type DashboardDto = {
  stats: UserStats;
  badges: Badge[];
  history: { id: string; lessonTitle: string; type: string; score: number; passed: boolean; createdAt: string }[];
};

export function getToken() {
  return localStorage.getItem("duo_token");
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem("duo_token", t);
  else localStorage.removeItem("duo_token");
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as any).error ?? `Erreur ${res.status}`);
  return data as T;
}

export const api = {
  register: (email: string, password: string, displayName: string) =>
    request<{ token: string; user: UserStats }>("POST", "/api/auth/register", { email, password, displayName }),
  login: (email: string, password: string) =>
    request<{ token: string; user: UserStats }>("POST", "/api/auth/login", { email, password }),
  me: () => request<UserStats>("GET", "/api/me"),
  units: () => request<UnitSummary[]>("GET", "/api/units"),
  lesson: (id: string) => request<LessonDto>("GET", `/api/lessons/${id}`),
  attempt: (exerciseId: string, transcript: string) =>
    request<AttemptResult>("POST", "/api/attempts", { exerciseId, transcript }),
  reveal: (exerciseId: string) =>
    request<{ answer: string; hearts: number }>("POST", `/api/exercises/${exerciseId}/reveal`, {}),
  completeLesson: (id: string) => request<CompleteResult>("POST", `/api/lessons/${id}/complete`),
  dashboard: () => request<DashboardDto>("GET", "/api/dashboard"),
};
