import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell page-hero">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p className="lede">
        That route is not in the PlugIndex catalog. Try searching the directory
        or browse recently updated plugins.
      </p>
      <div className="cta-row">
        <Link className="button button-primary" href="/plugins">
          Open directory
        </Link>
        <Link className="button button-ghost" href="/">
          Back home
        </Link>
      </div>
    </div>
  );
}
