export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <header className="not-found-brand">
        <span className="brand-icon">W.</span>
        <span>wordstreak</span>
      </header>

      <section className="not-found-card">
        <div className="not-found-art" aria-hidden="true">
          <span className="not-found-tile">4</span>
          <span className="not-found-tile green-tile">0</span>
          <span className="not-found-tile">4</span>
        </div>

        <p className="eyebrow">WORD NOT FOUND</p>
        <h1>Oops! Wrong turn.</h1>

        <p className="not-found-description">
          Looks like this page isn't in our dictionary.
          Let's get you back to the game!
        </p>

        <button
          className="primary-button not-found-button"
          onClick={() => {
            window.location.assign("/");
          }}
        >
          <span aria-hidden="true">←</span> Back to WordStreak
        </button>

        <p className="not-found-footnote">
          Every great word journey has a wrong guess.
        </p>
      </section>
    </main>
  );
}
