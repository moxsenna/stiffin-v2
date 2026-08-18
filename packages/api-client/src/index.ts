import type {
  Program,
  PublicWorkspaceProfile,
  PublicProgramCatalogItem,
  PublicProgramDetail,
  ProgramPublicPresentation,
  CreateProgramRequest,
  UpdateProgramRequest,
  UpdateProgramPresentationRequest,
  UpdateWorkspaceProfileRequest,
  UpsertLessonRequest,
  CreateFlowContactRequest,
  UpdateFlowContactProfileRequest,
  TransitionFlowContactStageRequest,
  ListFlowContactsQuery,
  CreateNextActionRequest,
  CompleteNextActionRequest,
  SkipNextActionRequest,
  RescheduleNextActionRequest,
  CompleteAftercareActionRequest,
  ListNextActionsQuery,
  CreateFlowServiceRequest,
  UpdateFlowServiceRequest,
  CreateMessageTemplateRequest,
  UpdateMessageTemplateRequest,
  ListMessageTemplatesQuery,
  ListAftercareQuery,
  CreateBookingRequest,
  RescheduleBookingRequest,
  CancelBookingRequest,
  ListBookingsQuery,
  WhatsAppOpenedRequest,
  ConfirmWhatsAppSentRequest,
  AvailabilityRuleDto,
  ReplaceAvailabilityRulesRequest,
  PublicSlotsQuery,
  CreatePublicBookingRequest,
  PublicRegisterLearnerRequest,
  PublicRegisterLearnerResponse,
  RedeemLearnerTokenRequest,
  RedeemLearnerTokenResponse,
  CreateManualEnrollmentRequest,
  CanonicalEnrollmentDto,
  LearningContextResponse,
} from '@promotor/contracts';

export interface ApiClientConfig {
  baseUrl: string;
  authToken?: string;
  credentials?: RequestCredentials;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ApiClient {
  private baseUrl: string;
  private authToken?: string;
  private credentials?: RequestCredentials;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.authToken = config.authToken;
    this.credentials = config.credentials;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, data);
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('PUT', endpoint, data);
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('PATCH', endpoint, data);
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint);
  }

  private async request<T>(method: string, endpoint: string, data?: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = this.getHeaders();
    const init: RequestInit = {
      method,
      headers,
    };
    if (this.credentials) {
      init.credentials = this.credentials;
    }
    if (data !== undefined) {
      init.body = JSON.stringify(data);
    }

    const res = await fetch(url, init);
    if (!res.ok) {
      let errBody: { error?: { code?: string; message?: string; details?: unknown } } | null = null;
      try {
        errBody = await res.json();
      } catch {
        // non-JSON response
      }
      const code = errBody?.error?.code ?? (res.status === 404 ? 'NOT_FOUND' : 'API_ERROR');
      const message = errBody?.error?.message ?? `API ${method} request failed: ${res.status} ${res.statusText}`;
      throw new ApiError(res.status, code, message, errBody?.error?.details);
    }

    if (res.status === 204) {
      return undefined as unknown as T;
    }

    return res.json();
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }
}

export class PromotorClassContentApiClient {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  // Public Endpoints
  async getPublicWorkspaceProfile(workspaceSlug: string): Promise<PublicWorkspaceProfile | null> {
    try {
      const res = await this.client.get<{ profile: PublicWorkspaceProfile }>(
        `/api/v1/public/workspaces/${encodeURIComponent(workspaceSlug)}`
      );
      return res.profile;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  async getPublicProgramCatalog(workspaceSlug: string): Promise<PublicProgramCatalogItem[]> {
    try {
      const res = await this.client.get<{ catalog: PublicProgramCatalogItem[] }>(
        `/api/v1/public/workspaces/${encodeURIComponent(workspaceSlug)}/programs`
      );
      return res.catalog;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return [];
      throw err;
    }
  }

  async getPublicProgramDetail(workspaceSlug: string, programSlug: string): Promise<PublicProgramDetail | null> {
    try {
      const res = await this.client.get<{ detail: PublicProgramDetail }>(
        `/api/v1/public/workspaces/${encodeURIComponent(workspaceSlug)}/programs/${encodeURIComponent(programSlug)}`
      );
      return res.detail;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  // Admin Endpoints
  async getPrograms(): Promise<Program[]> {
    const res = await this.client.get<{ programs: Program[] }>('/api/v1/programs');
    return res.programs;
  }

  async getProgramById(id: string): Promise<Program | undefined> {
    try {
      const res = await this.client.get<{ program: Program }>(`/api/v1/programs/${encodeURIComponent(id)}`);
      return res.program;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return undefined;
      throw err;
    }
  }

  async createProgram(input: CreateProgramRequest): Promise<Program> {
    const res = await this.client.post<{ program: Program }>('/api/v1/programs', input);
    return res.program;
  }

  async updateProgram(id: string, patch: UpdateProgramRequest): Promise<Program> {
    const res = await this.client.patch<{ program: Program }>(`/api/v1/programs/${encodeURIComponent(id)}`, patch);
    return res.program;
  }

  async deleteProgram(id: string): Promise<void> {
    await this.client.delete(`/api/v1/programs/${encodeURIComponent(id)}`);
  }

  async publishProgram(id: string): Promise<Program> {
    const res = await this.client.post<{ program: Program }>(`/api/v1/programs/${encodeURIComponent(id)}/publish`);
    return res.program;
  }

  async unpublishProgram(id: string): Promise<Program> {
    const res = await this.client.post<{ program: Program }>(`/api/v1/programs/${encodeURIComponent(id)}/unpublish`);
    return res.program;
  }

  async archiveProgram(id: string): Promise<Program> {
    const res = await this.client.post<{ program: Program }>(`/api/v1/programs/${encodeURIComponent(id)}/archive`);
    return res.program;
  }

  async restoreProgram(id: string): Promise<Program> {
    const res = await this.client.post<{ program: Program }>(`/api/v1/programs/${encodeURIComponent(id)}/restore`);
    return res.program;
  }

  async addModule(programId: string, title: string): Promise<Program> {
    const res = await this.client.post<{ program: Program }>(
      `/api/v1/programs/${encodeURIComponent(programId)}/modules`,
      { title }
    );
    return res.program;
  }

  async updateModule(programId: string, moduleId: string, title: string): Promise<Program> {
    const res = await this.client.patch<{ program: Program }>(
      `/api/v1/programs/${encodeURIComponent(programId)}/modules/${encodeURIComponent(moduleId)}`,
      { title }
    );
    return res.program;
  }

  async deleteModule(programId: string, moduleId: string): Promise<Program> {
    const res = await this.client.delete<{ program: Program }>(
      `/api/v1/programs/${encodeURIComponent(programId)}/modules/${encodeURIComponent(moduleId)}`
    );
    return res.program;
  }

  async reorderModules(programId: string, orderedModuleIds: string[]): Promise<Program> {
    const res = await this.client.post<{ program: Program }>(
      `/api/v1/programs/${encodeURIComponent(programId)}/modules/reorder`,
      { orderedModuleIds }
    );
    return res.program;
  }

  async addLesson(programId: string, moduleId: string, title: string, videoUrl?: string): Promise<Program> {
    const res = await this.client.post<{ program: Program }>(
      `/api/v1/programs/${encodeURIComponent(programId)}/modules/${encodeURIComponent(moduleId)}/lessons`,
      { title, videoUrl }
    );
    return res.program;
  }

  async saveLesson(programId: string, moduleId: string, lessonId: string, lesson: UpsertLessonRequest): Promise<Program> {
    const res = await this.client.patch<{ program: Program }>(
      `/api/v1/programs/${encodeURIComponent(programId)}/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}`,
      lesson
    );
    return res.program;
  }

  async deleteLesson(programId: string, moduleId: string, lessonId: string): Promise<Program> {
    const res = await this.client.delete<{ program: Program }>(
      `/api/v1/programs/${encodeURIComponent(programId)}/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}`
    );
    return res.program;
  }

  async reorderLessons(programId: string, moduleId: string, orderedLessonIds: string[]): Promise<Program> {
    const res = await this.client.post<{ program: Program }>(
      `/api/v1/programs/${encodeURIComponent(programId)}/modules/${encodeURIComponent(moduleId)}/lessons/reorder`,
      { orderedLessonIds }
    );
    return res.program;
  }

  async getProgramPresentation(programId: string): Promise<ProgramPublicPresentation> {
    const res = await this.client.get<{ presentation: ProgramPublicPresentation }>(
      `/api/v1/programs/${encodeURIComponent(programId)}/presentation`
    );
    return res.presentation;
  }

  async updateProgramPresentation(
    programId: string,
    patch: UpdateProgramPresentationRequest
  ): Promise<ProgramPublicPresentation> {
    const res = await this.client.put<{ presentation: ProgramPublicPresentation }>(
      `/api/v1/programs/${encodeURIComponent(programId)}/presentation`,
      patch
    );
    return res.presentation;
  }

  async getWorkspaceProfile(): Promise<PublicWorkspaceProfile> {
    const res = await this.client.get<{ profile: PublicWorkspaceProfile }>('/api/v1/storefront/profile');
    return res.profile;
  }

  async updateWorkspaceProfile(patch: UpdateWorkspaceProfileRequest): Promise<PublicWorkspaceProfile> {
    const res = await this.client.put<{ profile: PublicWorkspaceProfile }>('/api/v1/storefront/profile', patch);
    return res.profile;
  }

  // B4 Registration & Enrollment
  async registerPublicLearner(
    workspaceSlug: string,
    programSlug: string,
    data: PublicRegisterLearnerRequest
  ): Promise<PublicRegisterLearnerResponse> {
    return this.client.post(
      `/api/v1/public/${encodeURIComponent(workspaceSlug)}/programs/${encodeURIComponent(programSlug)}/register`,
      data
    );
  }

  async redeemLearnerToken(data: RedeemLearnerTokenRequest): Promise<RedeemLearnerTokenResponse> {
    return this.client.post('/api/v1/public/learner/redeem-token', data);
  }

  async getLearnerPrograms(): Promise<{ programs: Array<CanonicalEnrollmentDto & { programTitle: string; programSlug: string }> }> {
    return this.client.get('/api/v1/learner/programs');
  }

  async listClassEnrollments(filter?: { programId?: string; contactId?: string }): Promise<{ enrollments: CanonicalEnrollmentDto[] }> {
    const q = new URLSearchParams();
    if (filter?.programId) q.set('programId', filter.programId);
    if (filter?.contactId) q.set('contactId', filter.contactId);
    const qs = q.toString();
    return this.client.get(`/api/v1/class/enrollments${qs ? `?${qs}` : ''}`);
  }

  async createManualEnrollment(data: CreateManualEnrollmentRequest): Promise<{ enrollment: CanonicalEnrollmentDto }> {
    return this.client.post('/api/v1/class/enrollments', data);
  }

  async getLearningContext(contactId: string): Promise<LearningContextResponse> {
    return this.client.get(`/api/v1/class/contacts/${encodeURIComponent(contactId)}/learning-context`);
  }
}


export class PromotorFlowApiClient {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  // Today
  async getToday(): Promise<{
    overdue: any[];
    today: any[];
    upcoming: any[];
    totalActiveCount: number;
    timezone: string;
    computedAt: string;
  }> {
    return this.client.get('/api/v1/flow/today');
  }

  // Contacts
  async listContacts(query?: ListFlowContactsQuery): Promise<{ contacts: any[]; total: number }> {
    const q = new URLSearchParams();
    if (query?.search) q.set('search', query.search);
    if (query?.classification) q.set('classification', query.classification);
    if (query?.limit !== undefined) q.set('limit', String(query.limit));
    if (query?.offset !== undefined) q.set('offset', String(query.offset));
    const qs = q.toString();
    return this.client.get(`/api/v1/flow/contacts${qs ? `?${qs}` : ''}`);
  }

  async getContact(id: string): Promise<any> {
    return this.client.get(`/api/v1/flow/contacts/${encodeURIComponent(id)}`);
  }

  async createContact(data: CreateFlowContactRequest): Promise<any> {
    return this.client.post('/api/v1/flow/contacts', data);
  }

  async updateContact(id: string, data: UpdateFlowContactProfileRequest): Promise<any> {
    return this.client.patch(`/api/v1/flow/contacts/${encodeURIComponent(id)}`, data);
  }

  async transitionContactStage(id: string, data: TransitionFlowContactStageRequest): Promise<any> {
    return this.client.post(`/api/v1/flow/contacts/${encodeURIComponent(id)}/stage`, data);
  }

  async getContactActivities(id: string): Promise<{ activities: any[] }> {
    return this.client.get(`/api/v1/flow/contacts/${encodeURIComponent(id)}/activities`);
  }

  async getContactPrimaryNextAction(id: string): Promise<{ nextAction: any | null }> {
    return this.client.get(`/api/v1/flow/contacts/${encodeURIComponent(id)}/primary-next-action`);
  }

  async getContactAssessmentStatus(id: string): Promise<{ status: string }> {
    return this.client.get(`/api/v1/flow/contacts/${encodeURIComponent(id)}/assessment-status`);
  }

  // Next Actions
  async listNextActions(query?: ListNextActionsQuery): Promise<{ nextActions: any[] }> {
    const q = new URLSearchParams();
    if (query?.contactId) q.set('contactId', query.contactId);
    if (query?.status) q.set('status', query.status);
    const qs = q.toString();
    return this.client.get(`/api/v1/flow/next-actions${qs ? `?${qs}` : ''}`);
  }

  async createNextAction(data: CreateNextActionRequest): Promise<{ nextAction: any }> {
    return this.client.post('/api/v1/flow/next-actions', data);
  }

  async completeNextAction(id: string, data?: CompleteNextActionRequest): Promise<{ nextAction: any }> {
    return this.client.post(`/api/v1/flow/next-actions/${encodeURIComponent(id)}/complete`, data ?? {});
  }

  async skipNextAction(id: string, data: SkipNextActionRequest): Promise<{ nextAction: any }> {
    return this.client.post(`/api/v1/flow/next-actions/${encodeURIComponent(id)}/skip`, data);
  }

  async cancelNextAction(id: string): Promise<{ nextAction: any }> {
    return this.client.post(`/api/v1/flow/next-actions/${encodeURIComponent(id)}/cancel`);
  }

  async rescheduleNextAction(id: string, data: RescheduleNextActionRequest): Promise<{ nextAction: any }> {
    return this.client.post(`/api/v1/flow/next-actions/${encodeURIComponent(id)}/reschedule`, data);
  }

  async completeAftercareAction(id: string, data: CompleteAftercareActionRequest): Promise<{ nextAction: any }> {
    return this.client.post(`/api/v1/flow/next-actions/${encodeURIComponent(id)}/aftercare-complete`, data);
  }

  // Services
  async listServices(): Promise<{ services: any[] }> {
    return this.client.get('/api/v1/flow/services');
  }

  async createService(data: CreateFlowServiceRequest): Promise<{ service: any }> {
    return this.client.post('/api/v1/flow/services', data);
  }

  async updateService(id: string, data: UpdateFlowServiceRequest): Promise<{ service: any }> {
    return this.client.patch(`/api/v1/flow/services/${encodeURIComponent(id)}`, data);
  }

  // Message Templates
  async listMessageTemplates(query?: ListMessageTemplatesQuery): Promise<{ templates: any[] }> {
    const q = new URLSearchParams();
    if (query?.category) q.set('category', query.category);
    const qs = q.toString();
    return this.client.get(`/api/v1/flow/message-templates${qs ? `?${qs}` : ''}`);
  }

  async createMessageTemplate(data: CreateMessageTemplateRequest): Promise<{ template: any }> {
    return this.client.post('/api/v1/flow/message-templates', data);
  }

  async updateMessageTemplate(id: string, data: UpdateMessageTemplateRequest): Promise<{ template: any }> {
    return this.client.patch(`/api/v1/flow/message-templates/${encodeURIComponent(id)}`, data);
  }

  // Aftercare
  async listAftercare(query?: ListAftercareQuery): Promise<{ aftercare: any[] }> {
    const q = new URLSearchParams();
    if (query?.status) q.set('status', query.status);
    const qs = q.toString();
    return this.client.get(`/api/v1/flow/aftercare${qs ? `?${qs}` : ''}`);
  }

  // Bookings
  async listBookings(query?: ListBookingsQuery): Promise<{ bookings: any[] }> {
    const q = new URLSearchParams();
    if (query?.from) q.set('from', query.from);
    if (query?.to) q.set('to', query.to);
    if (query?.contactId) q.set('contactId', query.contactId);
    if (query?.status) q.set('status', query.status);
    const qs = q.toString();
    return this.client.get(`/api/v1/flow/bookings${qs ? `?${qs}` : ''}`);
  }

  async getBooking(id: string): Promise<{ booking: any }> {
    return this.client.get(`/api/v1/flow/bookings/${encodeURIComponent(id)}`);
  }

  async createBooking(data: CreateBookingRequest): Promise<{ booking: any }> {
    return this.client.post('/api/v1/flow/bookings', data);
  }

  async confirmBooking(id: string): Promise<{ booking: any }> {
    return this.client.post(`/api/v1/flow/bookings/${encodeURIComponent(id)}/confirm`);
  }

  async markBookingPaid(id: string): Promise<{ booking: any }> {
    return this.client.post(`/api/v1/flow/bookings/${encodeURIComponent(id)}/mark-paid`);
  }

  async rescheduleBooking(id: string, data: RescheduleBookingRequest): Promise<{ booking: any }> {
    return this.client.post(`/api/v1/flow/bookings/${encodeURIComponent(id)}/reschedule`, data);
  }

  async completeBooking(id: string): Promise<{ booking: any }> {
    return this.client.post(`/api/v1/flow/bookings/${encodeURIComponent(id)}/complete`);
  }

  async cancelBooking(id: string, data?: CancelBookingRequest): Promise<{ booking: any }> {
    return this.client.post(`/api/v1/flow/bookings/${encodeURIComponent(id)}/cancel`, data ?? {});
  }

  async noShowBooking(id: string): Promise<{ booking: any }> {
    return this.client.post(`/api/v1/flow/bookings/${encodeURIComponent(id)}/no-show`);
  }

  // Messaging
  async recordWhatsAppOpened(data: WhatsAppOpenedRequest): Promise<{ success: boolean; contactId: string; phoneE164: string }> {
    return this.client.post('/api/v1/flow/messaging/whatsapp-opened', data);
  }

  async confirmWhatsAppSent(data: ConfirmWhatsAppSentRequest): Promise<{ success: boolean; nextActionId: string }> {
    return this.client.post('/api/v1/flow/messaging/confirm-sent', data);
  }

  // Availability
  async getAvailability(): Promise<{ rules: AvailabilityRuleDto[] }> {
    return this.client.get('/api/v1/flow/availability');
  }

  async replaceAvailability(rules: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive?: boolean }>): Promise<{ rules: AvailabilityRuleDto[] }> {
    return this.client.put('/api/v1/flow/availability', { rules });
  }

  // Public Booking & Slots
  async getPublicSlots(slug: string, query: PublicSlotsQuery): Promise<{ slots: any[]; service: any }> {
    const q = new URLSearchParams();
    q.set('serviceId', query.serviceId);
    q.set('from', query.from);
    q.set('to', query.to);
    return this.client.get(`/api/v1/public/${encodeURIComponent(slug)}/slots?${q.toString()}`);
  }

  async createPublicBooking(slug: string, data: CreatePublicBookingRequest): Promise<{ bookingId: string; status: string; startAt: string; endAt: string; serviceTitle: string; amount: number }> {
    return this.client.post(`/api/v1/public/${encodeURIComponent(slug)}/bookings`, data);
  }
}

