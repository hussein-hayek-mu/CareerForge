"use client";

export default function PortfolioError({ retry }: { retry: () => void }) {
  return <main className="public-portfolio"><div className="empty-state"><h1>This portfolio is temporarily unavailable.</h1><p>Please try again. No private profile details are shown here.</p><button className="button primary" onClick={() => retry()}>Try again</button></div></main>;
}
