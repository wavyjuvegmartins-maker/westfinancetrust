import { InstallBanner } from "@/components/app/install";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WebsiteChrome } from "@/components/app/website-chrome";

// Marketing pages: public header and footer around every page.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WebsiteChrome>
        <SiteHeader />
      </WebsiteChrome>
      <main id="main" className="flex-1">
        {children}
      </main>
      <WebsiteChrome>
        <SiteFooter />
      </WebsiteChrome>
      <InstallBanner />
    </>
  );
}
