import { ProgramCompletedClient } from './ProgramCompletedClient';

export function generateStaticParams() {
  return [{ enrollmentId: 'enr_ayu_7hari' }, { enrollmentId: 'enr_nina_7hari' }];
}

export default function ProgramCompletedPage() {
  return <ProgramCompletedClient />;
}
