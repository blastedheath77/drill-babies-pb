'use client';

import { useEffect, useState } from 'react';

/**
 * Custom hook to detect if the current viewport is mobile
 * Uses a breakpoint of 768px (typical mobile/tablet boundary)
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Function to check if mobile
    const checkIsMobile = () => {
      return window.innerWidth < breakpoint;
    };

    // Set initial value
    setIsMobile(checkIsMobile());

    // Handler for resize events
    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [breakpoint]);

  return isMobile;
}

/**
 * Hook to detect tablet viewport (768px - 1024px)
 */
export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState<boolean>(false);

  useEffect(() => {
    const checkIsTablet = () => {
      const width = window.innerWidth;
      return width >= 768 && width < 1024;
    };

    setIsTablet(checkIsTablet());

    const handleResize = () => {
      setIsTablet(checkIsTablet());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isTablet;
}

/**
 * Hook to detect desktop viewport (>= 1024px)
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  useEffect(() => {
    const checkIsDesktop = () => {
      return window.innerWidth >= 1024;
    };

    setIsDesktop(checkIsDesktop());

    const handleResize = () => {
      setIsDesktop(checkIsDesktop());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isDesktop;
}

/**
 * Hook to get current viewport category
 */
export function useViewportSize(): 'mobile' | 'tablet' | 'desktop' {
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const getViewport = () => {
      const width = window.innerWidth;
      if (width < 768) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    };

    setViewport(getViewport());

    const handleResize = () => {
      setViewport(getViewport());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewport;
}