import { routeForLink } from '@/lib/links';

describe('quick launch links', () => {
  const routes = new Set(['/pick', '/zipper', '/charge', '/breathe']);
  const go = (link: string) => routeForLink(link, routes) ?? '/';

  it('opens a toy from its link', () => {
    expect(go('fidgetr://pick')).toBe('/pick');
    expect(go('fidgetr://zipper/')).toBe('/zipper');
    expect(go('/charge')).toBe('/charge');
    expect(go('fidgetr://breathe?from=shortcut')).toBe('/breathe');
  });

  it('still opens links from before the rename to fidgetr', () => {
    expect(go('fidget://pick')).toBe('/pick');
    expect(go('fidget://breathe?from=shortcut')).toBe('/breathe');
  });

  it('sends anything else home', () => {
    expect(go('fidgetr://nope')).toBe('/');
    expect(go('fidgetr://')).toBe('/');
    expect(go('fidgetr://fidget/abc')).toBe('/');
  });
});
