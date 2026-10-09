/** The route a quick-launch link (fidgetr://pick, the older fidget://pick, or a bare /pick) points at, if it's one we know. */
export function routeForLink(link: string, routes: Set<string>): string | null {
  const route = '/' + link.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^\/+/, '').split(/[?#]/)[0].replace(/\/+$/, '');
  return routes.has(route) ? route : null;
}
