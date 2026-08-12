import { SEED_ENROLLMENTS } from '@promotor/promotor-class-fixtures';
import { ProgramCompletedClient } from './ProgramCompletedClient';

export function generateStaticParams() {
  return SEED_ENROLLMENTS.map(e => ({ enrollmentId: e.id }));
}

export default function ProgramCompletedPage() {
  return <ProgramCompletedClient />;
}
