import { getProgramsQuery } from '@/modules/programs/queries';
import { ProgramDetailClient } from './ProgramDetailClient';

export async function generateStaticParams() {
  const programs = await getProgramsQuery();
  return programs.map(p => ({ programId: p.id }));
}

export default function ProgramDetailPage() {
  return <ProgramDetailClient />;
}
