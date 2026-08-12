export interface ProgramTemplate {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  priceType: 'free' | 'paid';
}

export interface TemplateRepositoryPort {
  getTemplates(): Promise<ProgramTemplate[]>;
  getTemplateById(id: string): Promise<ProgramTemplate | undefined>;
}
