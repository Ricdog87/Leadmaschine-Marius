/**
 * Workspace configuration. Single-tenant today (hohrising), multi-tenant-ready:
 * adding customer #2 means a new entry here — no code rewrite.
 */
export const TENANTS = {
  hohrising: {
    name: "hohrising × RSG·AI",
    sheetId: process.env.GOOGLE_SHEET_ID!,
    sheetTab: "Leads",
    range: "Leads!A2:R",
    headerRange: "Leads!A1:R1",
    statusColumn: "R",
    domainColumn: "D",
    allowedEmails: (process.env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    branding: { displayName: "hohrising · Kaffee (DACH)" },
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
