export interface PublicRegistrationPayload {
  workspaceSlug: string;
  programSlug: string;
  name: string;
  phoneRaw: string;
  email?: string | null;
}

export interface PublicRegistrationResponse {
  enrollmentId: string;
  contactId: string;
  organizationId: string;
  programId: string;
  programTitle: string;
  status: string;
  accessToken: string;
}

export interface RedeemTokenResponse {
  contactId: string;
  organizationId: string;
  sessionToken?: string;
}

export interface EnrollmentRepositoryPort {
  registerPublicLearner(payload: PublicRegistrationPayload): Promise<PublicRegistrationResponse>;
  redeemToken(token: string): Promise<RedeemTokenResponse>;
  createEnrollment(contactId: string, programId: string): Promise<{ id: string; status: string }>;
  getEnrollments(filter?: { programId?: string; contactId?: string }): Promise<any[]>;
  getEnrollmentById(id: string): Promise<any>;
}
