import Link from "next/link";

type PaginationProps = {
  page: number;
  pages: number;
  basePath: string;
  query?: Record<string, string | undefined>;
};

function hrefFor(basePath: string, page: number, query: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({ page, pages, basePath, query = {} }: PaginationProps) {
  if (pages <= 1) return null;
  const prev = page > 1 ? page - 1 : null;
  const next = page < pages ? page + 1 : null;

  return (
    <nav className="pagination" aria-label="Pagination">
      {prev ? (
        <Link href={hrefFor(basePath, prev, query)} rel="prev">
          ← Previous
        </Link>
      ) : (
        <span className="disabled">← Previous</span>
      )}
      <span className="page-status">
        Page {page} of {pages.toLocaleString()}
      </span>
      {next ? (
        <Link href={hrefFor(basePath, next, query)} rel="next">
          Next →
        </Link>
      ) : (
        <span className="disabled">Next →</span>
      )}
    </nav>
  );
}
