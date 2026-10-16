
import { useCallback, useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import NotFoundPage from "./pages/NotFoundPage";
import Header from "./components/Header";
import GameBoard from "./components/GameBoard";
import Keyboard from "./components/Keyboard";
import HintPanel from "./components/HintPanel";
import StatsModal from "./components/StatsModal";
import { supabase } from "./lib/supabase";
import { EMPTY_STATS, VALID_WORDS, newGame, feedbackFor, validGame, normalizeStats } from "./lib/gameLogic";
import "./index.css";


export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [game, setGame] = useState(null);
  const [stats, setStats] = useState({ ...EMPTY_STATS });
  const [showStats, setShowStats] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [cloudError, setCloudError] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  

  const [theme, setTheme] = useState(
    () => localStorage.getItem("wordstreak-theme") || "light"
  );

  useEffect(() => {
    localStorage.setItem("wordstreak-theme", theme);
  }, [theme]);
  
  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setCloudError(error.message);
      setSession(data?.session ?? null);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!alive) return;

      setSession(nextSession);

      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load only the currently authenticated user's record.
  useEffect(() => {
    if (!authReady || !session?.user?.id) {
      setGame(null);
      setStats({ ...EMPTY_STATS });
      return;
    }

    let cancelled = false;

    async function loadAccount() {
      setLoadingData(true);
      setCloudError("");

      try {
        const { data, error } = await supabase
          .from("wordstreak_data")
          .select("stats, game")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          throw new Error(
            "Your account data hasn't been initialized. Check that the database SQL trigger was installed."
          );
        }

        if (cancelled) return;

        setStats(normalizeStats(data.stats));
        if (validGame(data.game)) {
          // Older saved games may not have hint fields yet.
          setGame({
            ...data.game,
            hintPosition: Number.isInteger(data.game.hintPosition) &&
              data.game.hintPosition >= 0 &&
              data.game.hintPosition < 5
                ? data.game.hintPosition
                : null,
            hintUsed: data.game.hintUsed === true,
          });
        } else {
          setGame(newGame());
        }
      } catch (err) {
        if (!cancelled) setCloudError(err.message || "Could not load your game.");
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    loadAccount();

    return () => {
      cancelled = true;
    };
  }, [authReady, session?.user?.id]);

  // Debounced autosave to the account-specific database row.
  useEffect(() => {
    if (!session?.user?.id || !game || loadingData || recoveryMode) return;

    const userId = session.user.id;
    const timer = setTimeout(async () => {
      const { error } = await supabase
        .from("wordstreak_data")
        .update({ game, stats })
        .eq("user_id", userId);

      if (error) setCloudError(`Save failed: ${error.message}`);
      else setCloudError("");
    }, 350);

    return () => clearTimeout(timer);
  }, [session?.user?.id, game, stats, loadingData, recoveryMode]);

  const finishRound = useCallback((guess) => {
    if (!game || game.status !== "playing") return;

    if (guess.length !== 5) {
      setGame((old) => ({ ...old, message: "Enter a five-letter word!" }));
      return;
    }

    if (!VALID_WORDS.has(guess)) {
      setGame((old) => ({
        ...old,
        message: "That word isn't in our word list.",
      }));
      return;
    }

    if (game.guesses.includes(guess)) {
      setGame((old) => ({
        ...old,
        message: "You've already tried that word!",
      }));
      return;
    }

    const guesses = [...game.guesses, guess];
    const won = guess === game.answer;
    const lost = !won && guesses.length === 6;

    const nextGame = {
      ...game,
      guesses,
      current: "",
      status: won ? "won" : lost ? "lost" : "playing",
      message: won
        ? "Brilliant! You got it!"
        : lost
          ? `The word was ${game.answer}. Better luck next round!`
          : "",
    };

    setGame(nextGame);

    if (won || lost) {
      setStats((old) => {
        const nextStreak = won ? old.currentStreak + 1 : 0;

        return {
          games: old.games + 1,
          wins: old.wins + (won ? 1 : 0),
          losses: old.losses + (lost ? 1 : 0),
          currentStreak: nextStreak,
          bestStreak: Math.max(old.bestStreak, nextStreak),
        };
      });
    }
  }, [game]);

  const useHint = useCallback(() => {
    if (!game || game.status !== "playing" || game.hintUsed) return;

    // Prefer a position that hasn't already been discovered as green.
    const alreadyKnown = new Set();
    game.guesses.forEach((guess) => {
      feedbackFor(guess, game.answer).forEach((status, index) => {
        if (status === "correct") alreadyKnown.add(index);
      });
    });

    const available = [0, 1, 2, 3, 4].filter(
      (position) => !alreadyKnown.has(position)
    );
    const choices = available.length ? available : [0, 1, 2, 3, 4];
    const hintPosition = choices[Math.floor(Math.random() * choices.length)];
    const hintedLetter = game.answer[hintPosition];

    setGame((old) => ({
      ...old,
      hintPosition,
      hintUsed: true,
      message: `Hint revealed: ${hintedLetter} is in position ${hintPosition + 1}.`,
    }));
  }, [game]);

  const handleKey = useCallback((key) => {
    if (!game || showStats || recoveryMode) return;

    if (key === "ENTER") {
      finishRound(game.current);
    } else if (key === "BACKSPACE") {
      if (game.status === "playing") {
        setGame((old) => ({
          ...old,
          current: old.current.slice(0, -1),
          message: "",
        }));
      }
    } else if (/^[A-Z]$/.test(key) && game.status === "playing") {
      if (game.current.length < 5) {
        setGame((old) => ({
          ...old,
          current: old.current + key,
          message: "",
        }));
      }
    }
  }, [game, showStats, recoveryMode, finishRound]);

  useEffect(() => {
    function onKeyDown(event) {
      if (
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.repeat
      ) return;

      if (event.key === "Enter") handleKey("ENTER");
      else if (event.key === "Backspace") handleKey("BACKSPACE");
      else if (/^[a-zA-Z]$/.test(event.key)) {
        handleKey(event.key.toUpperCase());
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) setCloudError(error.message);
    setShowStats(false);
  }

  async function updatePassword(event) {
    event.preventDefault();
    setRecoveryMessage("");
    setCloudError("");

    if (newPassword.length < 8) {
      setCloudError("Use a password with at least 8 characters.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setCloudError(error.message);
    } else {
      setRecoveryMessage("Password updated successfully.");
      setNewPassword("");
      setRecoveryMode(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  
  if (
    window.location.pathname !== "/" &&
    window.location.pathname !== "/index.html"
  ) {
    return <NotFoundPage />;
  }

  if (!authReady) {
    return <main className="auth-page"><p>Loading WordStreak...</p></main>;
  }

  if (recoveryMode) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Choose a new password</h1>
          <form className="auth-form" onSubmit={updatePassword}>
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
            {cloudError && <p className="auth-error">{cloudError}</p>}
            {recoveryMessage && (
              <p className="auth-message">{recoveryMessage}</p>
            )}
            <button className="primary-button auth-submit">
              Update password
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (!session) return <AuthPage />;

  if (loadingData || !game) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Loading your game...</h1>
          {cloudError && <p className="auth-error">{cloudError}</p>}
          {cloudError && (
            <button className="secondary-button" onClick={() => window.location.reload()}>
              Retry
            </button>
          )}
        </section>
      </main>
    );
  }

  const keyboardRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
  ];

  const keyStatus = {};
  const priority = { absent: 1, present: 2, correct: 3 };

  game.guesses.forEach((guess) => {
    feedbackFor(guess, game.answer).forEach((status, index) => {
      const letter = guess[index];
      if (!keyStatus[letter] || priority[status] > priority[keyStatus[letter]]) {
        keyStatus[letter] = status;
      }
    });
  });

  const winPercentage = stats.games
    ? Math.round((stats.wins / stats.games) * 100)
    : 0;

  return (
    
    <main className={`app ${theme === "dark" ? "dark-mode" : ""}`}>
      <Header
        email={session.user.email}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === "light" ? "dark" : "light")}
        onShowStats={() => setShowStats(true)}
        onSignOut={signOut}
      />

      <section className="game">
        <p className="eyebrow">THE DAILY HABIT, REIMAGINED</p>
        <h1>One word at a time.</h1>
        <p className="subtitle">Guess correctly to keep your streak alive.</p>

        {cloudError && <p className="cloud-warning">{cloudError}</p>}

        <div className="stats">
          <div><span>CURRENT STREAK</span><strong>{stats.currentStreak}</strong></div>
          <div><span>BEST STREAK</span><strong>{stats.bestStreak}</strong></div>
          <div><span>WORDS SOLVED</span><strong>{stats.wins}</strong></div>
        </div>

        <div className="round-info">
          <span>ROUND {game.round}</span>
          <span>{game.guesses.length} / 6 GUESSES</span>
        </div>

        <HintPanel game={game} onUseHint={useHint} />

        <GameBoard game={game} feedbackFor={feedbackFor} />

        <p className="message" aria-live="polite">{game.message || " "}</p>

        {/* Hint controls are rendered by HintPanel above. */}
        <Keyboard rows={keyboardRows} keyStatus={keyStatus} onKey={handleKey} />

        {game.status !== "playing" && (
          <div className="round-actions">
            <button
              className="primary-button"
              onClick={() => setGame(newGame(game.answer, game.round + 1))}
            >
              Next Word
            </button>
            <button
              className="secondary-button"
              onClick={() => setGame(newGame(game.answer, 1))}
            >
              Start New Round
            </button>
          </div>
        )}

        <p className="autosave-note">✓ Your progress saves to your account</p>
      </section>

      <StatsModal
        open={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
        winPercentage={winPercentage}
      />
    </main>
  );
}