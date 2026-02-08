const LOCAL_BASE_URL = 'http://localhost';

export const sanitizeNextPath = (nextPath: string | null | undefined): string => {
  if (typeof nextPath !== 'string') {
    return '/';
  }

  const trimmed = nextPath.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return '/';
  }

  try {
    const parsed = new URL(trimmed, LOCAL_BASE_URL);
    if (parsed.origin !== LOCAL_BASE_URL || !parsed.pathname.startsWith('/')) {
      return '/';
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
};

export const getSafeNextPathFromSearch = (search: string): string => {
  const requestedNext = new URLSearchParams(search).get('next');
  return sanitizeNextPath(requestedNext);
};
