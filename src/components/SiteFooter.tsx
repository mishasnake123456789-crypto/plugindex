import Link from "next/link";
import { SITE_NAME } from "@/lib/wordpress";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div>
          <p className="footer-brand">{SITE_NAME}</p>
          <p className="muted">
            Independent index of public WordPress.org plugin data. Not affiliated
            with WordPress.org, Automattic, or the WordPress Foundation.
          </p>
        </div>
        <div className="footer-links">
          <Link href="/plugins">Directory</Link>
          <Link href="/how-search-works">How search works</Link>
          <Link href="/about">About</Link>
          <a
            href="https://wordpress.org/plugins/"
            rel="noopener noreferrer"
            target="_blank"
          >
            WordPress.org
          </a>
        </div>
      </div>
    </footer>
  );
}
