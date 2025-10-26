import { useState, useEffect } from 'react';

const useMediaQuery = (query: string): boolean => {
  // Check if window is defined to prevent errors during server-side rendering
  const isSsr = typeof window === 'undefined';

  const [matches, setMatches] = useState(
    isSsr ? false : window.matchMedia(query).matches
  );

  useEffect(() => {
    if (isSsr) return;

    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    
    // Initial check in case the state is stale
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query, isSsr]);

  return matches;
};

export default useMediaQuery;
