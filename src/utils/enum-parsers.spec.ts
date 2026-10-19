import { PlanePriority } from './enums/plane-priority.enum';
import { PlaneRelationType } from './enums/plane-relation-type.enum';
import { isAllowedHttpUrl } from './allowed-http-url';
import { parsePlanePriority, planePriorityLabel } from './plane-priority';
import { parsePlaneRelationType, planeRelationLabel } from './plane-relation-type';
import { cspImgSrc, isAbsoluteHttpHref, isAllowedUrlProtocol } from './url-protocol';

describe('priority', () => {
  it('parses known values and falls back to none', () => {
    expect(parsePlanePriority('urgent')).toBe(PlanePriority.URGENT);
    expect(parsePlanePriority('High')).toBe(PlanePriority.NONE);
    expect(parsePlanePriority(undefined)).toBe(PlanePriority.NONE);
    expect(parsePlanePriority(3)).toBe(PlanePriority.NONE);
  });

  it.each([
    [PlanePriority.URGENT, 'Urgent'],
    [PlanePriority.HIGH, 'High'],
    [PlanePriority.MEDIUM, 'Medium'],
    [PlanePriority.LOW, 'Low'],
    [PlanePriority.NONE, 'None'],
  ])('labels %s as %s', (priority, label) => {
    expect(planePriorityLabel(priority)).toBe(label);
  });
});

describe('relation type', () => {
  it('parses known values and falls back to relates-to', () => {
    expect(parsePlaneRelationType('blocked_by')).toBe(PlaneRelationType.BLOCKED_BY);
    expect(parsePlaneRelationType('nonsense')).toBe(PlaneRelationType.RELATES_TO);
    expect(parsePlaneRelationType(null)).toBe(PlaneRelationType.RELATES_TO);
  });

  it.each([
    [PlaneRelationType.BLOCKED_BY, 'Blocked by'],
    [PlaneRelationType.BLOCKING, 'Blocking'],
    [PlaneRelationType.RELATES_TO, 'Relates to'],
    [PlaneRelationType.DUPLICATE, 'Duplicate'],
  ])('labels %s as %s', (type, label) => {
    expect(planeRelationLabel(type)).toBe(label);
  });
});

describe('url protocol helpers', () => {
  it('allows only http and https', () => {
    expect(isAllowedUrlProtocol('https:')).toBe(true);
    expect(isAllowedUrlProtocol('http:')).toBe(true);
    expect(isAllowedUrlProtocol('javascript:')).toBe(false);
    expect(isAllowedUrlProtocol('file:')).toBe(false);
  });

  it('detects absolute http hrefs case-insensitively', () => {
    expect(isAbsoluteHttpHref('HTTPS://example.com')).toBe(true);
    expect(isAbsoluteHttpHref('/relative')).toBe(false);
    expect(isAbsoluteHttpHref('javascript://x')).toBe(false);
  });

  it('restricts webview images to the webview source', () => {
    expect(cspImgSrc()).toBe("'self'");
  });

  it('accepts only http and https URLs for opening', () => {
    expect(isAllowedHttpUrl('https://plane.test/x')).toBe(true);
    expect(isAllowedHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedHttpUrl('not a url')).toBe(false);
  });
});
