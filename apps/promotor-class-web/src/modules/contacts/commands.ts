import { getContactRepository } from '@/adapters';

export async function matchOrCreateContactCommand(name: string, phoneRaw: string) {
  return getContactRepository().matchOrCreateContact(name, phoneRaw);
}
