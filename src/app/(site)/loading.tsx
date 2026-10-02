import { PageLoader } from "@/components/spinner";

// Between marketing pages: header and footer stay, the spinner fills the page area.
export default function Loading() {
  return <PageLoader className="min-h-[70vh]" />;
}
