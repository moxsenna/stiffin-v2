import { contactRepository } from '@/adapters/mock/contact-repository';

export async function getContactsQuery() {
  return contactRepository.getContacts();
}

export async function getContactByIdQuery(id: string) {
  return contactRepository.getContactById(id);
}
