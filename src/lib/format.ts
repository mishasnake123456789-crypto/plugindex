export function formatInstalls(n: number | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M+`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K+`;
  return String(n);
}

export function formatRelativeTime(input: string | undefined): string {
  if (!input) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    // WordPress sometimes returns "2026-10-30 7:10pm GMT"
    const normalized = input.replace(/(\d{1,2}):(\d{2})(am|pm)/i, (_, h, m, ap) => {
      let hour = Number(h);
      const isPm = String(ap).toLowerCase() === "pm";
      if (isPm && hour < 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;
      return `${String(hour).padStart(2, "0")}:${m}:00`;
    });
    const retry = new Date(normalized);
    if (Number.isNaN(retry.getTime())) return input;
    return relativeFromDate(retry);
  }
  return relativeFromDate(date);
}

function relativeFromDate(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 60) return `${days}d ago`;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}
