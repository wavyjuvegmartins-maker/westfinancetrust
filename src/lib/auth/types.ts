/** What the app knows about the signed-in person. Safe to send to the browser. */
export type UserRole = "customer" | "account_opener" | "admin";

export type UserProfile = {
  id: string; // Supabase auth user id
  userId: string; // login ID, e.g. aloy.tony
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  memberSince: string;
  branch: string;
  role: UserRole;
  mustChangePassword: boolean;
};

export const fullName = (u: Pick<UserProfile, "firstName" | "lastName">) => `${u.firstName} ${u.lastName}`;

/** Where someone goes after signing in. */
export const homeFor = (u: Pick<UserProfile, "role" | "mustChangePassword">) =>
  u.mustChangePassword ? "/change-password" : u.role === "customer" ? "/dashboard" : "/admin";
