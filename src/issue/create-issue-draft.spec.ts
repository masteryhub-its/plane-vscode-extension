import { draftFromIntake, draftFromTemplate } from './create-issue-draft';

describe('draftFromTemplate', () => {
  it('copies the template name and HTML description', () => {
    expect(draftFromTemplate({ id: 't1', name: 'Bug', descriptionHtml: '<p>Steps</p>' })).toEqual({
      name: 'Bug',
      descriptionHtml: '<p>Steps</p>',
    });
  });
});

describe('draftFromIntake', () => {
  it('prefills the issue name from the intake item', () => {
    expect(draftFromIntake({ id: 'in1', name: 'Customer report', issueId: undefined })).toEqual({
      name: 'Customer report',
      descriptionHtml: '',
    });
  });
});
