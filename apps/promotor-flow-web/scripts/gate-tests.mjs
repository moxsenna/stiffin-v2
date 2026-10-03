import { execSync } from 'child_process';

console.log('Running typecheck...');
execSync('pnpm typecheck', { stdio: 'inherit' });

console.log('Running tests...');
execSync('pnpm test', { stdio: 'inherit' });

console.log('GATECHECK tests passed');
