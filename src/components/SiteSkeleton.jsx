export default function SiteSkeleton() {
  return (
    <div className="site-skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the shop</span>
      <div className="sk-promo sk-block" />
      <div className="sk-header">
        <span className="sk-block sk-logo" />
        <span className="sk-block sk-nav" />
        <span className="sk-block sk-search" />
      </div>
      <div className="sk-hero">
        <div className="sk-copy">
          <span className="sk-block sk-line sm" />
          <span className="sk-block sk-line lg" />
          <span className="sk-block sk-line lg" />
          <span className="sk-block sk-line md" />
          <span className="sk-block sk-btn" />
        </div>
        <div className="sk-stage sk-block" />
      </div>
      <div className="sk-grid">
        {["a", "b", "c", "d"].map((id) => (
          <div className="sk-card" key={id}>
            <span className="sk-block sk-photo" />
            <span className="sk-block sk-line sm" />
            <span className="sk-block sk-line md" />
          </div>
        ))}
      </div>
      <div className="sk-foot">
        <span className="sk-block sk-line md" />
        <span className="sk-block sk-line sm" />
        <span className="sk-block sk-line sm" />
      </div>
    </div>
  );
}
