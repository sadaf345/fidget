import { routeForLink } from '@/lib/links';

describe('quick launch links', () => {
  const routes = new Set(['/pick', '/zipper', '/charge', '/breathe']);
  const go = (link: string) => routeForLink(link, routes) ?? '/';

  it('opens a toy from its link', () => {
    expect(go('fidget://pick')).toBe('/pick');
    expect(go('fidget://zipper/')).toBe('/zipper');
    expect(go('/charge')).toBe('/charge');
    expect(go('fidget://breathe?from=shortcut')).toBe('/breathe');
  });

  it('sends anything else home', () => {
    expect(go('fidget://nope')).toBe('/');
    expect(go('fidget://')).toBe('/');
    expect(go('fidget://fidget/abc')).toBe('/');
  });
});
