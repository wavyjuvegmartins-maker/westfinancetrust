import { PageLoader } from "@/components/spinner";

// Shown while the staff area checks the session.
export default function Loading() {
  return <PageLoader label="Opening the staff area" className="min-h-dvh bg-canvas" />;
}
