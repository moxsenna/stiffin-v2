import { resetDemoState } from '@/adapters';

export async function resetDemoStateCommand() {
  await resetDemoState();
}
