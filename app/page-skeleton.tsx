/** Placeholder shown in the static HTML until the URL-driven client view hydrates, so the page never flashes empty. */
export function PageSkeleton({ aside = true }: { aside?: boolean }) {
  return (
    <div className={aside ? 'skeleton with-aside' : 'skeleton'} aria-busy="true" aria-label="กำลังโหลด">
      {aside && <div className="skeleton-block tall" />}
      <div className="skeleton-stack">
        <div className="skeleton-block" />
        <div className="skeleton-block" />
        <div className="skeleton-block short" />
      </div>
    </div>
  );
}
