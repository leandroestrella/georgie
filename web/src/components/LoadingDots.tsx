/** Three dots that blink in sequence to signal work in progress. */
export function LoadingDots() {
  return (
    <span className="ml-0.5 inline-flex" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ animation: 'georgie-blink 1.4s infinite', animationDelay: `${i * 0.2}s` }}>
          .
        </span>
      ))}
    </span>
  )
}
