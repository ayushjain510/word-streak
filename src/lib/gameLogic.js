import englishWords from "an-array-of-english-words";

export const WORDS = [...new Set(englishWords.filter((word) => /^[a-z]{5}$/i.test(word)).map((word) => word.toUpperCase()))];
export const VALID_WORDS = new Set(WORDS);
export const EMPTY_STATS = { games: 0, wins: 0, losses: 0, currentStreak: 0, bestStreak: 0 };

export function newGame(previous = "", round = 1) {
  const choices = WORDS.filter((word) => word !== previous);
  return { answer: choices[Math.floor(Math.random() * choices.length)], guesses: [], current: "", status: "playing", round, message: "", hintPosition: null, hintUsed: false };
}

export function feedbackFor(guess, answer) {
  const result = Array(5).fill("absent");
  const remaining = {};
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) result[i] = "correct";
    else remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] !== "absent") continue;
    if (remaining[guess[i]] > 0) { result[i] = "present"; remaining[guess[i]]--; }
  }
  return result;
}

export function validGame(value) {
  return !!(value && typeof value.answer === "string" && WORDS.includes(value.answer) && Array.isArray(value.guesses) && value.guesses.length <= 6 && value.guesses.every((word) => typeof word === "string" && /^[A-Z]{5}$/.test(word) && VALID_WORDS.has(word)) && typeof value.current === "string" && /^[A-Z]{0,5}$/.test(value.current) && ["playing", "won", "lost"].includes(value.status) && Number.isInteger(value.round) && value.round >= 1);
}

export function normalizeStats(value) {
  if (!value || typeof value !== "object") return { ...EMPTY_STATS };
  const safeNumber = (number) => Number.isInteger(number) && number >= 0 ? number : 0;
  return { games: safeNumber(value.games), wins: safeNumber(value.wins), losses: safeNumber(value.losses), currentStreak: safeNumber(value.currentStreak), bestStreak: safeNumber(value.bestStreak) };
}
