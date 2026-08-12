import { LearnerProgramClient } from './LearnerProgramClient';

export function generateStaticParams() {
  return [{ enrollmentId: 'enr_ayu_7hari' }, { enrollmentId: 'enr_nina_7hari' }];
}

export default function LearnerProgramPage() {
  return <LearnerProgramClient />;
}
