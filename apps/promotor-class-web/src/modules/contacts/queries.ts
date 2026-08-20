import { getContactRepository } from '@/adapters';

export async function getContactsQuery() {
  return getContactRepository().getContacts();
}

export async function getContactByIdQuery(id: string) {
  return getContactRepository().getContactById(id);
}
