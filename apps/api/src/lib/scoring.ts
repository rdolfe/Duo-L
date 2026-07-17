// Évaluation de prononciation : on compare la transcription STT au texte attendu.
// Alignement mot à mot (programmation dynamique) + similarité de Levenshtein par mot.

// Nombres en toutes lettres → valeur. On canonicalise tout nombre (chiffres ou
// mots) vers sa forme chiffrée, pour que « 1 », « one », « twenty-one » et « 21 »
// soient traités comme identiques lors de la comparaison.
const UNITS_MAP: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS_MAP: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALES_MAP: Record<string, number> = { hundred: 100, thousand: 1000, million: 1000000 };
const NUMBER_WORDS = new Set([
  ...Object.keys(UNITS_MAP),
  ...Object.keys(TENS_MAP),
  ...Object.keys(SCALES_MAP),
]);

// Convertit une suite de mots-nombres (« one hundred and one ») en valeur.
function parseNumberRun(run: string[]): number {
  let total = 0;
  let current = 0;
  for (const t of run) {
    if (t in UNITS_MAP) current += UNITS_MAP[t];
    else if (t in TENS_MAP) current += TENS_MAP[t];
    else if (t === "hundred") current = (current || 1) * 100;
    else if (t === "thousand") { total += (current || 1) * 1000; current = 0; }
    else if (t === "million") { total += (current || 1) * 1000000; current = 0; }
  }
  return total + current;
}

// Fusionne les suites de mots-nombres en un unique jeton chiffré ; laisse les
// chiffres tels quels et les autres mots inchangés.
function canonicalizeNumbers(tokens: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (NUMBER_WORDS.has(t)) {
      const run: string[] = [];
      let j = i;
      while (j < tokens.length) {
        if (NUMBER_WORDS.has(tokens[j])) {
          run.push(tokens[j]);
          j++;
        } else if (
          // « and » n'est un connecteur que juste après une échelle : « hundred and one »
          tokens[j] === "and" &&
          run.length > 0 &&
          run[run.length - 1] in SCALES_MAP &&
          j + 1 < tokens.length &&
          NUMBER_WORDS.has(tokens[j + 1])
        ) {
          j++;
        } else {
          break;
        }
      }
      out.push(String(parseNumberRun(run)));
      i = j;
    } else {
      out.push(t);
      i++;
    }
  }
  return out;
}

export function normalizeWords(s: string): string[] {
  const tokens = s
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return canonicalizeNumbers(tokens);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

function wordSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const d = levenshtein(a, b);
  return Math.max(0, 1 - d / Math.max(a.length, b.length));
}

export type WordScore = { word: string; score: number };

export function scoreUtterance(expected: string, actual: string): { score: number; wordScores: WordScore[] } {
  const E = normalizeWords(expected);
  const A = normalizeWords(actual);
  if (E.length === 0) return { score: 0, wordScores: [] };
  if (A.length === 0) return { score: 0, wordScores: E.map((w) => ({ word: w, score: 0 })) };

  // Alignement type Needleman-Wunsch qui maximise la similarité totale.
  const n = E.length, m = A.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1] + wordSimilarity(E[i - 1], A[j - 1]));
    }
  }
  // Backtrack pour retrouver le score de chaque mot attendu.
  const perWord = new Array<number>(n).fill(0);
  let i = n, j = m;
  while (i > 0 && j > 0) {
    const diag = dp[i - 1][j - 1] + wordSimilarity(E[i - 1], A[j - 1]);
    if (Math.abs(dp[i][j] - diag) < 1e-9) {
      perWord[i - 1] = wordSimilarity(E[i - 1], A[j - 1]);
      i--; j--;
    } else if (dp[i][j] === dp[i - 1][j]) {
      i--;
    } else {
      j--;
    }
  }
  // Mots parasites : légère pénalité si la transcription est beaucoup plus longue.
  const extraPenalty = Math.max(0, (m - n) / Math.max(n, 1)) * 0.1;
  const mean = perWord.reduce((s, x) => s + x, 0) / n;
  const score = Math.round(Math.max(0, mean - extraPenalty) * 100);
  return {
    score,
    wordScores: E.map((w, k) => ({ word: w, score: Math.round(perWord[k] * 100) })),
  };
}

// Retourne le meilleur score parmi plusieurs réponses acceptées.
export function scoreAgainstCandidates(candidates: string[], actual: string) {
  let best = { score: -1, wordScores: [] as WordScore[], matched: "" };
  for (const c of candidates) {
    const r = scoreUtterance(c, actual);
    if (r.score > best.score) best = { ...r, matched: c };
  }
  return best;
}
