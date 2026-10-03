import fs from 'node:fs';

const emptyStateComponent = 'src/components/pwa/EmptyStateFeedback.tsx';
const learnHome = 'src/app/(learner)/learn/page.tsx';
const jadwalPage = 'src/app/(learner)/learn/jadwal/page.tsx';

if (!fs.existsSync(emptyStateComponent) || !fs.existsSync(learnHome) || !fs.existsSync(jadwalPage)) {
  console.error('Missing target files for empty states');
  process.exit(1);
}

const compContent = fs.readFileSync(emptyStateComponent, 'utf8');
const learnContent = fs.readFileSync(learnHome, 'utf8');
const jadwalContent = fs.readFileSync(jadwalPage, 'utf8');

const hasComponentExports = compContent.includes('EmptyStateCard') && compContent.includes('SkeletonCard');
const hasLearnHomeUsage = learnContent.includes('EmptyStateCard');
const hasJadwalUsage = jadwalContent.includes('EmptyStateCard');

if (!hasComponentExports || !hasLearnHomeUsage || !hasJadwalUsage) {
  console.error('Standardized EmptyStateCard/SkeletonCard not used properly');
  process.exit(1);
}

console.log('GATECHECK empty states passed');
