import type { PlaneIntakeItem, PlaneTemplate } from '../client/plane.types';

export interface CreateIssueDraft {
  readonly name: string;
  readonly descriptionHtml: string;
}

export function draftFromTemplate(template: PlaneTemplate): CreateIssueDraft {
  return { name: template.name, descriptionHtml: template.descriptionHtml };
}

export function draftFromIntake(item: PlaneIntakeItem): CreateIssueDraft {
  return { name: item.name, descriptionHtml: '' };
}
