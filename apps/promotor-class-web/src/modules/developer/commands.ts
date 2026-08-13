import { MockStateStore } from '@/adapters/mock/mock-state-store';

export async function resetDemoStateCommand() {
  MockStateStore.resetDemo();
}
