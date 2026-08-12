import { PromotorClassAdapterPort, DemoScenarioPreset } from './ports';

export function createPromotorClassCommands(adapter: PromotorClassAdapterPort) {
  return {
    async setDemoScenario(preset: DemoScenarioPreset): Promise<void> {
      return adapter.setDemoScenario(preset);
    },

    async enrollContact(contactId: string, programId: string): Promise<{ enrollmentId: string }> {
      return adapter.enrollContact(contactId, programId);
    },
  };
}
