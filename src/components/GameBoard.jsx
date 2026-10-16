export default function GameBoard({ game, feedbackFor }) {
  return <div className="board">{Array.from({ length: 6 }, (_, row) => { const guess = game.guesses[row]; const letters = guess || (row === game.guesses.length ? game.current : ""); const feedback = guess ? feedbackFor(guess, game.answer) : []; return <div className="board-row" key={row}>{Array.from({ length: 5 }, (_, col) => <div key={col} className={["tile", feedback[col] || "", !guess && letters[col] ? "filled" : ""].join(" ")}>{letters[col] || ""}</div>)}</div>; })}</div>;
}
