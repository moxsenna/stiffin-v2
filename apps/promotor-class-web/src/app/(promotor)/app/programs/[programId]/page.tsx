import { SEED_PROGRAMS } from '@promotor/promotor-class-fixtures';
import { ProgramDetailClient } from './ProgramDetailClient';

export function generateStaticParams() {
  return SEED_PROGRAMS.map(p => ({ programId: p.id }));
}

export default function ProgramDetailPage() {
  return <ProgramDetailClient />;
}
