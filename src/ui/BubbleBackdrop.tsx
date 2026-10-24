export function BubbleBackdrop({ dense = false }: { dense?: boolean }) {
  return (
    <div className={`bubble-backdrop ${dense ? "is-dense" : ""}`} aria-hidden="true">
      <span className="blob blob-1" />
      <span className="blob blob-2" />
      <span className="blob blob-3" />
      <span className="blob blob-4" />
      <span className="blob blob-5" />
      <span className="bubble-ring bubble-ring-1" />
      <span className="bubble-ring bubble-ring-2" />
    </div>
  );
}
