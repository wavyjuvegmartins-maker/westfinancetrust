import { PageLoader } from "@/components/spinner";

// Between dashboard pages: keeps the sidebar and tab bar, spins in the content area.
export default function Loading() {
  return <PageLoader />;
}
