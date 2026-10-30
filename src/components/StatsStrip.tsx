type StatsStripProps = {
  total?: number;
  updatedHint?: string;
  newHint?: string;
  freshness?: string;
};

export function StatsStrip({
  total,
  updatedHint = "live from WordPress.org",
  newHint = "browse newly added",
  freshness = "API sync on demand",
}: StatsStripProps) {
  return (
    <ul className="stats-strip" aria-label="Directory stats">
      <li>
        <strong>{total?.toLocaleString() ?? "70,000+"}</strong>
        <span>active plugins indexed</span>
      </li>
      <li>
        <strong>{updatedHint}</strong>
        <span>recent updates</span>
      </li>
      <li>
        <strong>{newHint}</strong>
        <span>new plugins</span>
      </li>
      <li>
        <strong>{freshness}</strong>
        <span>directory freshness</span>
      </li>
    </ul>
  );
}
