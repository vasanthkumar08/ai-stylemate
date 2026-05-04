export type AppRole = "user" | "admin";

export type AppUserRole = {
  id: string;
  email: string;
  role: AppRole;
  status: string;
  plan: "free" | "pro";
};
