/**
 * Server-resolved tenant context. B1 callers pass this explicitly;
 * when Better Auth lands (B2), this value comes from the session,
 * never from client input.
 */
export interface OrganizationContext {
  organizationId: string;
}

export function isOrganizationContext(value: unknown): value is OrganizationContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as OrganizationContext).organizationId === 'string' &&
    (value as OrganizationContext).organizationId.length > 0
  );
}
