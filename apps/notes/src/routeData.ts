import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import type { StarlightRouteData } from '@astrojs/starlight/route-data';

type SidebarEntry = StarlightRouteData['sidebar'][number];

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;

  // Get first two path segments (e.g., "exchanges/uniswap-v2")
  const pathParts = context.url.pathname.split('/').filter(Boolean);
  const currentSection = pathParts.slice(0, 2).join('/');

  // Recursively filter entries and set collapsed to false
  function filterEntries(entries: SidebarEntry[], section: string): SidebarEntry[] {
    return entries
      .map((entry): SidebarEntry | null => {
        if (entry.type === 'link') {
          const belongsToSection = entry.href.startsWith(`/${section}/`) || entry.href === `/${section}`;
          return belongsToSection ? entry : null;
        }

        if (entry.type === 'group') {
          const filteredSubEntries = filterEntries(entry.entries, section);
          if (filteredSubEntries.length === 0) return null;

          return {
            ...entry,
            collapsed: false,
            entries: filteredSubEntries,
          };
        }

        return entry;
      })
      .filter((entry): entry is SidebarEntry => entry !== null);
  }

  // Filter sidebar
  route.sidebar = filterEntries(route.sidebar, currentSection);

  // Helper to check if a link belongs to current section
  const belongsToCurrentSection = (href: string) => {
    const normalized = href.startsWith('/') ? href.slice(1) : href;
    return normalized.startsWith(currentSection + '/') || normalized === currentSection;
  };

  // Filter pagination to only show links within the same section
  if (route.pagination.prev && !belongsToCurrentSection(route.pagination.prev.href)) {
    route.pagination.prev = undefined;
  }

  if (route.pagination.next && !belongsToCurrentSection(route.pagination.next.href)) {
    route.pagination.next = undefined;
  }
});
