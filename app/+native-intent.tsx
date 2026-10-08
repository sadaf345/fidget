import { TOYS } from '@/constants/toys';
import { routeForLink } from '@/lib/links';

const TOY_ROUTES = new Set(TOYS.map(t => t.route));

/**
 * Quick launch: fidget://pick (from Shortcuts, the Action Button or Control Center) opens that toy.
 * Anything else lands on the home screen.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return routeForLink(path, TOY_ROUTES) ?? '/';
}
