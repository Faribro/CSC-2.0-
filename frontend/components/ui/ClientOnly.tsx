'use client';

import React, { useEffect, useState } from 'react';

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * ClientOnly wrapper prevents Next.js SSR hydration mismatches caused by
 * third-party browser extensions (e.g. Bitdefender TrafficLight, Urban VPN,
 * LastPass) that inject attributes like bis_skin_checked="1" into DOM nodes prior to hydration.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return fallback ? <div suppressHydrationWarning className="contents">{fallback}</div> : null;
  }

  return (
    <div suppressHydrationWarning className="contents">
      {children}
    </div>
  );
}
