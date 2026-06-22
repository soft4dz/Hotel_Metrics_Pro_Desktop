import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** lg (1024px) — navbar horizontale visible */
export function useIsNavBarLayout() {
  return useMediaQuery('(min-width: 1024px)');
}

/** xl (1280px) — libellés courts dans la navbar */
export function useIsNavLabelsVisible() {
  return useMediaQuery('(min-width: 1280px)');
}

/** 2xl (1536px) — libellés complets */
export function useIsNavLabelsFull() {
  return useMediaQuery('(min-width: 1536px)');
}
