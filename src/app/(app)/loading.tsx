import { PageLoader } from "@/components/spinner";

// Shown while online banking signs the customer in and loads their accounts.
export default function Loading() {
  return <PageLoader label="Opening your accounts" className="min-h-dvh bg-canvas" />;
}
