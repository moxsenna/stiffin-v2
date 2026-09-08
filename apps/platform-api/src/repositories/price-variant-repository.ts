import { eq, and, asc } from 'drizzle-orm';
import type { DbHandle } from '../db/client';
import {
  programPriceVariants,
  type ProgramPriceVariantRow,
  type NewProgramPriceVariantRow,
} from '../db/schema/program-price-variants';
import type { ProgramPriceVariant } from '@promotor/contracts';

export interface PriceVariantRepository {
  listByProgram(organizationId: string, programId: string): Promise<ProgramPriceVariant[]>;
  findById(organizationId: string, id: string): Promise<ProgramPriceVariant | null>;
  findByIdAndProgram(
    organizationId: string,
    programId: string,
    id: string
  ): Promise<ProgramPriceVariant | null>;
  create(data: Omit<NewProgramPriceVariantRow, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProgramPriceVariant>;
  update(
    organizationId: string,
    programId: string,
    id: string,
    patch: Partial<Omit<NewProgramPriceVariantRow, 'id' | 'organizationId' | 'programId' | 'createdAt' | 'updatedAt'>>
  ): Promise<ProgramPriceVariant | null>;
  delete(organizationId: string, programId: string, id: string): Promise<boolean>;
  clearDefault(organizationId: string, programId: string): Promise<void>;
}

function toDto(row: ProgramPriceVariantRow): ProgramPriceVariant {
  return {
    id: row.id,
    programId: row.programId,
    label: row.label,
    description: row.description ?? null,
    priceAmount: row.priceAmount,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date(row.createdAt).toISOString(),
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date(row.updatedAt).toISOString(),
  };
}

export function createPriceVariantRepository(db: DbHandle): PriceVariantRepository {
  return {
    async listByProgram(organizationId: string, programId: string): Promise<ProgramPriceVariant[]> {
      const rows = await db
        .select()
        .from(programPriceVariants)
        .where(
          and(
            eq(programPriceVariants.organizationId, organizationId),
            eq(programPriceVariants.programId, programId)
          )
        )
        .orderBy(asc(programPriceVariants.sortOrder), asc(programPriceVariants.createdAt));
      return rows.map(toDto);
    },

    async findById(organizationId: string, id: string): Promise<ProgramPriceVariant | null> {
      const rows = await db
        .select()
        .from(programPriceVariants)
        .where(
          and(
            eq(programPriceVariants.organizationId, organizationId),
            eq(programPriceVariants.id, id)
          )
        )
        .limit(1);
      return rows[0] ? toDto(rows[0]) : null;
    },

    async findByIdAndProgram(
      organizationId: string,
      programId: string,
      id: string
    ): Promise<ProgramPriceVariant | null> {
      const rows = await db
        .select()
        .from(programPriceVariants)
        .where(
          and(
            eq(programPriceVariants.organizationId, organizationId),
            eq(programPriceVariants.programId, programId),
            eq(programPriceVariants.id, id)
          )
        )
        .limit(1);
      return rows[0] ? toDto(rows[0]) : null;
    },

    async create(data): Promise<ProgramPriceVariant> {
      const [inserted] = await db
        .insert(programPriceVariants)
        .values({
          organizationId: data.organizationId,
          programId: data.programId,
          label: data.label,
          description: data.description ?? null,
          priceAmount: data.priceAmount,
          isDefault: data.isDefault ?? false,
          sortOrder: data.sortOrder ?? 0,
        })
        .returning();
      return toDto(inserted);
    },

    async update(organizationId, programId, id, patch): Promise<ProgramPriceVariant | null> {
      const [updated] = await db
        .update(programPriceVariants)
        .set({
          ...(patch.label !== undefined ? { label: patch.label } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.priceAmount !== undefined ? { priceAmount: patch.priceAmount } : {}),
          ...(patch.isDefault !== undefined ? { isDefault: patch.isDefault } : {}),
          ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(programPriceVariants.organizationId, organizationId),
            eq(programPriceVariants.programId, programId),
            eq(programPriceVariants.id, id)
          )
        )
        .returning();
      return updated ? toDto(updated) : null;
    },

    async delete(organizationId, programId, id): Promise<boolean> {
      const deleted = await db
        .delete(programPriceVariants)
        .where(
          and(
            eq(programPriceVariants.organizationId, organizationId),
            eq(programPriceVariants.programId, programId),
            eq(programPriceVariants.id, id)
          )
        )
        .returning({ id: programPriceVariants.id });
      return deleted.length > 0;
    },

    async clearDefault(organizationId, programId): Promise<void> {
      await db
        .update(programPriceVariants)
        .set({ isDefault: false, updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(programPriceVariants.organizationId, organizationId),
            eq(programPriceVariants.programId, programId)
          )
        );
    },
  };
}
