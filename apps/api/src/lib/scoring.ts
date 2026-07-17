// Évaluation de prononciation : on compare la transcription STT au texte attendu.
// Alignement mot à mot (programmation dynamique) + similarité de Levenshtein par mot.

const NUMBER_WORDS: Record<string, string> = {
  "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five",
  "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten",
  "11": "eleven", "12": "twelve", "13": "thirteen", "14": "fourteen", "15": "fifteen",
  "16": "sixteen", "17": "seventeen", "18": "eighteen", "19": "nineteen", "20": "twenty",
};

export function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => NUMBER_WORDS[w] ?? w);
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
