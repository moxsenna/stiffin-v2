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
}
