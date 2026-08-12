import { PublicLandingClient } from './PublicLandingClient';

export function generateStaticParams() {
  return [{ workspaceSlug: 'rina', programSlug: '7-hari-mengenal-cara-belajar-anak' }];
}

export default function PublicProgramLandingPage() {
  return <PublicLandingClient />;
}
