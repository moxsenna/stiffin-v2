import { PromotorClassAdapterPort, DemoScenarioPreset } from './ports';
import { EnrollContactInput, EnrollmentRef } from '@promotor/contracts';

export function createPromotorClassCommands(adapter: PromotorClassAdapterPort) {
  return {
    async setDemoScenario(preset: DemoScenarioPreset): Promise<void> {
      return adapter.setDemoScenario(preset);
    },

    async enrollContact(input: EnrollContactInput): Promise<EnrollmentRef> {
      return adapter.enrollContact(input);
    },
  };
}
