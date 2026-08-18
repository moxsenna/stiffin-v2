import { ApiClient, PromotorClassContentApiClient } from '@promotor/api-client';
import { ProgramRepositoryPort } from '@/modules/programs/ports';
import { PublicStorefrontRepositoryPort } from '@/modules/public-storefront/ports';
import { EnrollmentRepositoryPort } from '@/modules/enrollments/ports';
import { MockProgramRepository } from './mock/program-repository';
import { MockPublicStorefrontRepository } from './mock/public-storefront-repository';
import { MockEnrollmentRepository } from './mock/enrollment-repository';
import { HttpProgramRepository } from './http/program-repository';
import { HttpPublicStorefrontRepository } from './http/public-storefront-repository';
import { HttpEnrollmentRepository } from './http/enrollment-repository';

let programRepoInstance: ProgramRepositoryPort | null = null;
let storefrontRepoInstance: PublicStorefrontRepositoryPort | null = null;
let enrollmentRepoInstance: EnrollmentRepositoryPort | null = null;

function getApiMode(): 'http' | 'mock' {
  const mode = process.env.NEXT_PUBLIC_API_MODE;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (mode !== 'http') {
      throw new Error(
        '[Adapter Factory] Production environment requires NEXT_PUBLIC_API_MODE="http". Mock mode is strictly forbidden in production.'
      );
    }
    return 'http';
  }

  return mode === 'http' ? 'http' : 'mock';
}

function getApiClient(): PromotorClassContentApiClient {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
  const client = new ApiClient({
    baseUrl,
    credentials: 'include',
  });
  return new PromotorClassContentApiClient(client);
}

export function getProgramRepository(): ProgramRepositoryPort {
  if (!programRepoInstance) {
    const mode = getApiMode();
    if (mode === 'http') {
      programRepoInstance = new HttpProgramRepository(getApiClient());
    } else {
      programRepoInstance = new MockProgramRepository();
    }
  }
  return programRepoInstance;
}

export function getPublicStorefrontRepository(): PublicStorefrontRepositoryPort {
  if (!storefrontRepoInstance) {
    const mode = getApiMode();
    if (mode === 'http') {
      storefrontRepoInstance = new HttpPublicStorefrontRepository(getApiClient());
    } else {
      storefrontRepoInstance = new MockPublicStorefrontRepository();
    }
  }
  return storefrontRepoInstance;
}

export function getEnrollmentRepository(): EnrollmentRepositoryPort {
  if (!enrollmentRepoInstance) {
    const mode = getApiMode();
    if (mode === 'http') {
      enrollmentRepoInstance = new HttpEnrollmentRepository(getApiClient());
    } else {
      enrollmentRepoInstance = new MockEnrollmentRepository();
    }
  }
  return enrollmentRepoInstance;
}

export function resetAdapterInstances(): void {
  programRepoInstance = null;
  storefrontRepoInstance = null;
  enrollmentRepoInstance = null;
}

