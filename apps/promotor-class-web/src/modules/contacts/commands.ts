import { contactRepository } from '@/adapters/mock/contact-repository';

export async function matchOrCreateContactCommand(name: string, phoneRaw: string) {
  return contactRepository.matchOrCreateContact(name, phoneRaw);
}
