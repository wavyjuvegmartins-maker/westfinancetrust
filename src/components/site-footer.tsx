import Link from "next/link";
import { Logo } from "@/components/logo";
import { ratesNote } from "@/lib/rates";
import { nav, site } from "@/lib/site";

const groups = [
  { title: "Banking", links: nav.filter((n) => ["/personal", "/business", "/cards", "/loans"].includes(n.href)) },
  { title: "West Finance Trust", links: nav.filter((n) => ["/about", "/security", "/contact"].includes(n.href)) },
  { title: "Online banking", links: [{ href: "/login", label: "Log in" }, { href: "/contact#open-account", label: "Open an account" }] },
];

export function SiteFooter() {
  return (
    <footer className="bg-deep text-white">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.3fr_2fr] lg:py-20">
        <div className="max-w-sm">
          <Logo tone="light" />
          <p className="mt-5 leading-relaxed text-white/65">
            Accounts opened in person, banking done online. Personal and business banking with people you can
            actually talk to.
          </p>
          <dl className="mt-8 space-y-3 text-sm">
            <div>
              <dt className="text-white/50">Call us</dt>
              <dd>
                <a href={site.phoneHref} className="font-semibold text-white hover:text-amber">
                  {site.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-white/50">Email</dt>
              <dd>
                <a href={`mailto:${site.email}`} className="font-semibold text-white hover:text-amber">
                  {site.email}
                </a>
              </dd>
            </div>
          </dl>
        </div>

        <div className="grid gap-10 sm:grid-cols-3">
          {groups.map((group) => (
            <div key={group.title}>
              <h2 className="font-sans text-sm font-semibold text-white/50">{group.title}</h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-white/85 transition-colors hover:text-amber">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page space-y-2 py-8 text-sm leading-relaxed text-white/50">
          <p>{ratesNote} Loan products are not yet available and all loans will be subject to approval.</p>
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
