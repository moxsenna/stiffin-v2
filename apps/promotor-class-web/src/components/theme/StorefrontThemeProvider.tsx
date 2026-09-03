'use client';

import React, { createContext, useContext, useMemo } from 'react';
import {
  PublicStorefrontTheme,
  TALIRA_DEFAULT_STOREFRONT_THEME,
  generateStorefrontCssVariables,
} from '@promotor/contracts';

interface StorefrontThemeContextValue {
  theme: PublicStorefrontTheme;
  cssVars: Record<string, string>;
}

const StorefrontThemeContext = createContext<StorefrontThemeContextValue>({
  theme: TALIRA_DEFAULT_STOREFRONT_THEME,
  cssVars: generateStorefrontCssVariables(TALIRA_DEFAULT_STOREFRONT_THEME),
});

export function useStorefrontTheme(): StorefrontThemeContextValue {
  return useContext(StorefrontThemeContext);
}

interface StorefrontThemeProviderProps {
  theme?: PublicStorefrontTheme | null;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function StorefrontThemeProvider({
  theme: customTheme,
  children,
  className = '',
  style = {},
}: StorefrontThemeProviderProps) {
  const theme = useMemo<PublicStorefrontTheme>(() => {
    if (!customTheme) return TALIRA_DEFAULT_STOREFRONT_THEME;
    return {
      brandName: customTheme.brandName || TALIRA_DEFAULT_STOREFRONT_THEME.brandName,
      tagline: customTheme.tagline ?? null,
      logoUrl: customTheme.logoUrl ?? null,
      primaryColor: customTheme.primaryColor || TALIRA_DEFAULT_STOREFRONT_THEME.primaryColor,
      accentColor: customTheme.accentColor || TALIRA_DEFAULT_STOREFRONT_THEME.accentColor,
      backgroundColor: customTheme.backgroundColor || TALIRA_DEFAULT_STOREFRONT_THEME.backgroundColor,
      surfaceColor: customTheme.surfaceColor || TALIRA_DEFAULT_STOREFRONT_THEME.surfaceColor,
      textColor: customTheme.textColor || TALIRA_DEFAULT_STOREFRONT_THEME.textColor,
      mutedTextColor: customTheme.mutedTextColor || TALIRA_DEFAULT_STOREFRONT_THEME.mutedTextColor,
      stylePreset: customTheme.stylePreset || TALIRA_DEFAULT_STOREFRONT_THEME.stylePreset,
      fontPreset: customTheme.fontPreset || TALIRA_DEFAULT_STOREFRONT_THEME.fontPreset,
      radiusPreset: customTheme.radiusPreset || TALIRA_DEFAULT_STOREFRONT_THEME.radiusPreset,
      buttonPreset: customTheme.buttonPreset || TALIRA_DEFAULT_STOREFRONT_THEME.buttonPreset,
      layoutPreset: customTheme.layoutPreset || TALIRA_DEFAULT_STOREFRONT_THEME.layoutPreset,
      heroAlignment: customTheme.heroAlignment || TALIRA_DEFAULT_STOREFRONT_THEME.heroAlignment,
    };
  }, [customTheme]);

  const cssVars = useMemo(() => {
    return generateStorefrontCssVariables(theme);
  }, [theme]);

  return (
    <StorefrontThemeContext.Provider value={{ theme, cssVars }}>
      {/* Preconnect & Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Manrope:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div
        className={`storefront-theme-root ${className}`.trim()}
        style={{
          ...(cssVars as React.CSSProperties),
          ...style,
          fontFamily: 'var(--brand-font)',
          color: 'var(--brand-text)',
          backgroundColor: 'var(--brand-bg)',
          minHeight: '100vh',
        }}
      >
        {children}
      </div>
    </StorefrontThemeContext.Provider>
  );
}
