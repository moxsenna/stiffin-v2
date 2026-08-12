import { SEED_ENROLLMENTS } from '@promotor/promotor-class-fixtures';
import { LearnerProgramClient } from './LearnerProgramClient';

export function generateStaticParams() {
  return SEED_ENROLLMENTS.map(e => ({ enrollmentId: e.id }));
}

export default function LearnerProgramPage() {
  return <LearnerProgramClient />;
}
