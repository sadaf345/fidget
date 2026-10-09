import { TOYS } from '@/constants/toys';
import { routeForLink } from '@/lib/links';

const TOY_ROUTES = new Set(TOYS.map(t => t.route));

/**
 * Quick launch: fidgetr://pick (from Shortcuts, the Action Button or Control Center) opens that toy. The old
 * fidget:// scheme still works, for shortcuts made before the rename.
 * Anything else lands on the home screen.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return routeForLink(path, TOY_ROUTES) ?? '/';
}
