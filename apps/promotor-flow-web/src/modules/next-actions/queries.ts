import { NextActionRepositoryPort } from './ports';
import { FlowNextAction } from '@promotor/promotor-flow-fixtures';
import { ClockPort } from '../clock/ports';

export interface TodayQueueItem {
  action: FlowNextAction;
  contactName: string;
  contactPhone: string;
  contactStage: string;
  sourceChannel?: string;
}

export interface TodayQueue {
  overdue: TodayQueueItem[];
  today: TodayQueueItem[];
  upcoming: TodayQueueItem[];
  totalActiveCount: number;
  overdueCount: number;
}

export function createNextActionQueries(
  actionRepo: NextActionRepositoryPort,
  clock: ClockPort,
  contactLookupFn: (contactId: string) => Promise<{ name: string; phoneE164: string; stage: string; sourceChannel?: string } | null>
) {
  return {
    async getTodayQueue(organizationId: string): Promise<TodayQueue> {
      const actions = await actionRepo.listNextActions(organizationId, 'PENDING');
      const now = clock.now();

      // Normalize today bounds
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const overdueItems: TodayQueueItem[] = [];
      const todayItems: TodayQueueItem[] = [];
      const upcomingItems: TodayQueueItem[] = [];

      for (const action of actions) {
        const due = new Date(action.dueAt);
        const contactInfo = await contactLookupFn(action.contactId);
        const item: TodayQueueItem = {
          action,
          contactName: contactInfo?.name || 'Kontak',
          contactPhone: contactInfo?.phoneE164 || '',
          contactStage: contactInfo?.stage || '',
          sourceChannel: contactInfo?.sourceChannel,
        };

        if (due < startOfToday) {
          overdueItems.push(item);
        } else if (due <= endOfToday) {
          todayItems.push(item);
        } else {
          upcomingItems.push(item);
        }
      }

      // Sort overdue by most past due first, today by dueAt asc
      overdueItems.sort((a, b) => new Date(a.action.dueAt).getTime() - new Date(b.action.dueAt).getTime());
      todayItems.sort((a, b) => new Date(a.action.dueAt).getTime() - new Date(b.action.dueAt).getTime());
      upcomingItems.sort((a, b) => new Date(a.action.dueAt).getTime() - new Date(b.action.dueAt).getTime());

      return {
        overdue: overdueItems,
        today: todayItems,
        upcoming: upcomingItems,
        totalActiveCount: overdueItems.length + todayItems.length,
        overdueCount: overdueItems.length,
      };
    },

    async getContactNextActions(organizationId: string, contactId: string): Promise<FlowNextAction[]> {
      return actionRepo.getContactNextActions(organizationId, contactId);
    },
  };
}
