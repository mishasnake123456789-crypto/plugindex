import Link from "next/link";
import { SITE_NAME } from "@/lib/wordpress";

const links = [
  { href: "/plugins", label: "Directory" },
  { href: "/recently-updated", label: "Updated" },
  { href: "/new", label: "New" },
  { href: "/tags", label: "Tags" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label={`${SITE_NAME} home`}>
          <span className="brand-mark" aria-hidden />
          <span className="brand-text">{SITE_NAME}</span>
        </Link>
        <nav className="nav" aria-label="Primary">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
