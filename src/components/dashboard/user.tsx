"use client";

import { createContext, useContext } from "react";
import type { UserProfile } from "@/lib/auth/types";

const UserContext = createContext<UserProfile | null>(null);

/** Makes the signed-in customer available to every dashboard component. */
export function UserProvider({ user, children }: { user: UserProfile; children: React.ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("useUser must be used inside <UserProvider>");
  return user;
}
