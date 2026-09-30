import "server-only";
import { cache } from "react";
import type { UserProfile } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileRow = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  branch: string;
  role: UserProfile["role"];
  status: "active" | "suspended" | "closed";
  must_change_password: boolean;
  created_at: string;
};

export const toProfile = (row: ProfileRow): UserProfile => ({
  id: row.id,
  userId: row.user_id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone ?? "",
  branch: row.branch,
  role: row.role,
  mustChangePassword: row.must_change_password,
  memberSince: new Date(row.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
});

/**
 * The signed-in person, or null. Verifies the session with Supabase and reads
 * their profile through row level security. Suspended or closed profiles are
 * treated as signed out. Cached for the length of one request.
 */
export const getSessionUser = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return null;

  const { data: row } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle<ProfileRow>();
  if (!row || row.status !== "active") return null;
  return toProfile(row);
});
