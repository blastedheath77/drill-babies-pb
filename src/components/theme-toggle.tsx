'use client';

import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  iconOnly?: boolean;
}

export function ThemeToggle({ iconOnly = false }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(true); // Default to dark mode

  useEffect(() => {
    // Check localStorage for saved preference, default to dark if not set
    const savedTheme = localStorage.getItem('theme');
    const isDarkMode = savedTheme === 'light' ? false : true; // Default to dark

    setIsDark(isDarkMode);

    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  if (iconOnly) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="h-9 w-9 rounded-full border-2"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="flex items-center gap-2"
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4" />
          Light Mode
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          Dark Mode
        </>
      )}
    </Button>
  );
}