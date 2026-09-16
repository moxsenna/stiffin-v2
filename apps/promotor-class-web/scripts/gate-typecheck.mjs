// Portable gate: typecheck promotor-class-web
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  execSync('npx tsc --noEmit', { cwd: root, stdio: 'pipe', timeout: 240000 });
  console.log('GATECHECK typecheck passed');
} catch (e) {
  console.log(String(e.stdout || '').slice(-3000));
  console.log(String(e.stderr || '').slice(-3000));
  process.exit(1);
}
