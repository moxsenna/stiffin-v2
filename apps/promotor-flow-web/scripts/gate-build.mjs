import { execSync } from 'child_process';

console.log('Running build...');
execSync('pnpm build', { stdio: 'inherit' });

console.log('GATECHECK build passed');
