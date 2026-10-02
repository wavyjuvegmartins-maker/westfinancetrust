"use client";

import { usePathname } from "next/navigation";

// Pages that act as app screens when the site runs as the installed app: there the
// website's header and footer are hidden so they look like part of the app.
const appScreens = ["/login"];

export function WebsiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className={appScreens.includes(pathname) ? "contents standalone:hidden" : "contents"}>{children}</div>;
}
