import { detectIssueKeys, detectPlaneUrls } from './detect-links';

describe('detect-links', () => {
  it('detects issue keys', () => {
    expect(detectIssueKeys('Please fix MH-42 soon')).toEqual([{ identifier: 'MH', sequenceId: 42, raw: 'MH-42' }]);
  });

  it('detects browse and project URLs', () => {
    const server = 'https://plane.example.test';
    const browse = detectPlaneUrls(`${server}/acme/browse/MH-7/`, server);
    expect(browse[0]?.browseKey).toBe('MH');
    const project = detectPlaneUrls(`${server}/acme/projects/550e8400-e29b-41d4-a716-446655440000/issues/650e8400-e29b-41d4-a716-446655440000/`, server);
    expect(project[0]?.issueId).toBe('650e8400-e29b-41d4-a716-446655440000');
  });
});
