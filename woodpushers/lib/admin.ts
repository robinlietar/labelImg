/**
 * Admin gate. Admins are identified by Supabase auth user id, listed in the
 * ADMIN_USER_IDS env var (comma separated).
 */
export function adminUserIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return adminUserIds().includes(userId);
}
