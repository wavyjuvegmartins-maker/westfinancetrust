import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WaitingForApproval } from "@/app/authorize/waiting";
import { currentDeviceRequest, describeDevice } from "@/lib/auth/devices";
import { getSessionUser } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/types";

export const metadata: Metadata = {
  title: "Waiting for authorization",
  robots: { index: false, follow: false },
};

// Where a sign-in from an unrecognised device waits for staff to approve it.
export default async function AuthorizePage() {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));
  const request = await currentDeviceRequest();
  if (!request) redirect("/login");

  return <WaitingForApproval device={describeDevice(request.user_agent ?? "")} />;
}
