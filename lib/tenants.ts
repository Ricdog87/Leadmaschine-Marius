/** Sales role of a dashboard user. */
export type UserRole = "Closer" | "Setter" | "Admin";

/** Display identity for a dashboard user (resolved from their email). */
export interface UserProfile {
  nickname: string;
  role: UserRole;
  short: string;
}

/**
 * Workspace configuration. Single-tenant today (hohrising), multi-tenant-ready:
 * adding customer #2 means a new entry here — no code rewrite.
 */
export const TENANTS = {
  hohrising: {
    name: "hohrising × RSG·AI",
    sheetId: process.env.GOOGLE_SHEET_ID!,
    sheetTab: "RSG_Staging_Leads",
    range: "RSG_Staging_Leads!A2:R",
    headerRange: "RSG_Staging_Leads!A1:R1",
    statusColumn: "R",
    domainColumn: "D",
    allowedEmails: (process.env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    /**
     * Per-user display identity (email → profile), keyed lowercase.
     * Roles agreed in the Marius onboarding: Marius = Closer, Marvin = Setter.
     */
    users: {
      "m.hohmann@hohrising.com": {
        nickname: "Marius the Closer",
        role: "Closer",
        short: "Marius",
      },
      "google@hohrising.com": {
        nickname: "Marius the Closer",
        role: "Closer",
        short: "Marius",
      },
      "gmb.hohrising@gmail.com": {
        nickname: "Marvin the Setter",
        role: "Setter",
        short: "Marvin",
      },
      "hello@rsg-ai.de": {
        nickname: "RSG·AI",
        role: "Admin",
        short: "RSG·AI",
      },
      "r.serrano@recruiting-sg.de": {
        nickname: "Ricardo · RSG·AI",
        role: "Admin",
        short: "Ricardo",
      },
    } as Record<string, UserProfile>,
    /** Daily call target per user (onboarding: 15 calls/day). */
    dailyCallTarget: 15,
    branding: { displayName: "hohrising", tagline: "SEO · E-Shop Leads" },
    /** Placeholder pipeline value per "Termin" lead, in EUR. */
    pipelineValuePerTermin: 9999,
  },
  // Kunde #2 später hier rein
} as const;

export type TenantKey = keyof typeof TENANTS;
export type Tenant = (typeof TENANTS)[TenantKey];

export const activeTenant = (): Tenant => {
  const key = process.env.ACTIVE_TENANT as TenantKey;
  const tenant = TENANTS[key];
  if (!tenant) {
    throw new Error(
      `Unknown ACTIVE_TENANT "${process.env.ACTIVE_TENANT}". Known tenants: ${Object.keys(
        TENANTS,
      ).join(", ")}`,
    );
  }
  return tenant;
};

/** The email → profile map for the active tenant (safe to send to client). */
export const tenantUsers = (): Record<string, UserProfile> =>
  activeTenant().users as Record<string, UserProfile>;

/** Resolve a user's display profile by email; falls back to a derived name. */
export const getUserProfile = (email?: string | null): UserProfile => {
  const key = (email ?? "").trim().toLowerCase();
  const profile = tenantUsers()[key];
  if (profile) return profile;
  const local = key.split("@")[0] || "user";
  const nickname = local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { nickname: nickname || "User", role: "Setter", short: nickname };
};
