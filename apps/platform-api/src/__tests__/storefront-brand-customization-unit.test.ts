import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HexColorSchema,
  StorefrontStylePresetSchema,
  StorefrontFontPresetSchema,
  StorefrontRadiusPresetSchema,
  StorefrontButtonPresetSchema,
  StorefrontLayoutPresetSchema,
  HeroAlignmentSchema,
  UpdateStorefrontThemeRequestSchema,
  TALIRA_DEFAULT_STOREFRONT_THEME,
  STYLE_PRESET_TOKENS,
  parseHexColor,
  getLuminance,
  getContrastRatio,
  getReadableTextColor,
  validateThemeContrast,
  generateStorefrontCssVariables,
} from '@promotor/contracts';

describe('Storefront Brand Customization — Unit Tests', () => {
  describe('1. Hex Color Schema Validation', () => {
    it('accepts valid 6-character hex colors', () => {
      assert.equal(HexColorSchema.parse('#201e1d'), '#201e1d');
      assert.equal(HexColorSchema.parse('#EC3013'), '#EC3013');
      assert.equal(HexColorSchema.parse('#ffffff'), '#ffffff');
      assert.equal(HexColorSchema.parse('#000000'), '#000000');
    });

    it('rejects invalid color formats and dangerous inputs', () => {
      const invalidColors = [
        'red',
        '#fff',
        '#ffff',
        'rgb(0,0,0)',
        'rgba(0,0,0,1)',
        '#GGGGGG',
        'javascript:alert(1)',
        'expression(alert(1))',
        '',
        '#201e1d; background: red;',
      ];

      for (const color of invalidColors) {
        assert.throws(
          () => HexColorSchema.parse(color),
          `Expected ${color} to be rejected by HexColorSchema`
        );
      }
    });
  });

  describe('2. Preset Enums Validation', () => {
    it('validates style preset enum', () => {
      assert.equal(StorefrontStylePresetSchema.parse('MODERNIST'), 'MODERNIST');
      assert.equal(StorefrontStylePresetSchema.parse('SOFT'), 'SOFT');
      assert.equal(StorefrontStylePresetSchema.parse('MINIMAL'), 'MINIMAL');
      assert.equal(StorefrontStylePresetSchema.parse('EDITORIAL'), 'EDITORIAL');
      assert.throws(() => StorefrontStylePresetSchema.parse('ARBITRARY'));
    });

    it('validates font preset enum', () => {
      assert.equal(StorefrontFontPresetSchema.parse('ARCHIVO'), 'ARCHIVO');
      assert.equal(StorefrontFontPresetSchema.parse('INTER'), 'INTER');
      assert.equal(StorefrontFontPresetSchema.parse('MANROPE'), 'MANROPE');
      assert.equal(StorefrontFontPresetSchema.parse('LORA'), 'LORA');
      assert.throws(() => StorefrontFontPresetSchema.parse('ComicSans'));
    });

    it('validates radius preset enum', () => {
      assert.equal(StorefrontRadiusPresetSchema.parse('SHARP'), 'SHARP');
      assert.equal(StorefrontRadiusPresetSchema.parse('SOFT'), 'SOFT');
      assert.equal(StorefrontRadiusPresetSchema.parse('ROUNDED'), 'ROUNDED');
      assert.throws(() => StorefrontRadiusPresetSchema.parse('50%'));
    });

    it('validates button preset enum', () => {
      assert.equal(StorefrontButtonPresetSchema.parse('SOLID'), 'SOLID');
      assert.equal(StorefrontButtonPresetSchema.parse('OUTLINE'), 'OUTLINE');
      assert.equal(StorefrontButtonPresetSchema.parse('SOFT'), 'SOFT');
      assert.throws(() => StorefrontButtonPresetSchema.parse('3D'));
    });

    it('validates layout and alignment enums', () => {
      assert.equal(StorefrontLayoutPresetSchema.parse('LIST'), 'LIST');
      assert.equal(StorefrontLayoutPresetSchema.parse('GRID'), 'GRID');
      assert.equal(HeroAlignmentSchema.parse('LEFT'), 'LEFT');
      assert.equal(HeroAlignmentSchema.parse('CENTER'), 'CENTER');
    });
  });

  describe('3. Contrast & Luminance Calculations (WCAG 2.1)', () => {
    it('correctly calculates luminance for pure black and white', () => {
      assert.equal(getLuminance('#000000'), 0);
      assert.equal(getLuminance('#FFFFFF'), 1);
    });

    it('calculates 21:1 contrast ratio between pure black and pure white', () => {
      const contrast = getContrastRatio('#000000', '#FFFFFF');
      assert.equal(contrast, 21);
    });

    it('calculates 1:1 contrast ratio for identical colors', () => {
      const contrast = getContrastRatio('#201e1d', '#201e1d');
      assert.equal(contrast, 1);
    });

    it('automatically picks safe readable foreground (white or black)', () => {
      // Dark background -> white text
      assert.equal(getReadableTextColor('#201e1d'), '#FFFFFF');
      assert.equal(getReadableTextColor('#000000'), '#FFFFFF');
      assert.equal(getReadableTextColor('#1e293b'), '#FFFFFF');

      // Light background -> dark text
      assert.equal(getReadableTextColor('#FFFFFF'), '#111827');
      assert.equal(getReadableTextColor('#f3f2f2'), '#111827');
      assert.equal(getReadableTextColor('#fef08a'), '#111827');
    });

    it('validates theme contrast and detects accessible defaults', () => {
      const result = validateThemeContrast(TALIRA_DEFAULT_STOREFRONT_THEME);
      assert.equal(result.isAccessible, true);
      assert.ok(result.contrastRatios.textOnBackground >= 4.5);
      assert.ok(result.contrastRatios.textOnSurface >= 4.5);
    });

    it('detects low contrast issues when poor colors are provided', () => {
      const lowContrastTheme = {
        ...TALIRA_DEFAULT_STOREFRONT_THEME,
        textColor: '#e5e7eb', // very light gray text
        backgroundColor: '#ffffff', // white background -> low contrast
        surfaceColor: '#ffffff',
      };
      const result = validateThemeContrast(lowContrastTheme);
      assert.equal(result.isAccessible, false);
      assert.ok(result.issues.length > 0);
    });
  });

  describe('4. Theme Presets & CSS Variable Generator', () => {
    it('provides all 4 required style presets with complete token definitions', () => {
      const presets = ['MODERNIST', 'SOFT', 'MINIMAL', 'EDITORIAL'] as const;
      for (const preset of presets) {
        const tokens = STYLE_PRESET_TOKENS[preset];
        assert.ok(tokens, `Preset ${preset} must exist`);
        assert.equal(tokens.stylePreset, preset);
        assert.ok(tokens.primaryColor.startsWith('#'));
        assert.ok(tokens.accentColor.startsWith('#'));
        assert.ok(tokens.backgroundColor.startsWith('#'));
      }
    });

    it('generates safe, structured CSS variables from theme', () => {
      const cssVars = generateStorefrontCssVariables(TALIRA_DEFAULT_STOREFRONT_THEME);
      assert.equal(cssVars['--brand-primary'], '#201e1d');
      assert.equal(cssVars['--brand-accent'], '#ec3013');
      assert.equal(cssVars['--brand-bg'], '#f3f2f2');
      assert.equal(cssVars['--brand-surface'], '#ffffff');
      assert.equal(cssVars['--brand-radius'], '0px');
      assert.ok(cssVars['--brand-font'].includes('Archivo'));
      assert.equal(cssVars['--brand-primary-fg'], '#FFFFFF');
    });

    it('rejects unsafe logo URLs in theme request', () => {
      assert.throws(() => {
        UpdateStorefrontThemeRequestSchema.parse({
          brandName: 'Test Brand',
          logoUrl: 'http://insecure.com/logo.png', // Non-HTTPS
          ...STYLE_PRESET_TOKENS.MODERNIST,
        });
      });

      assert.throws(() => {
        UpdateStorefrontThemeRequestSchema.parse({
          brandName: 'Test Brand',
          logoUrl: 'javascript:alert(1)', // Script injection
          ...STYLE_PRESET_TOKENS.MODERNIST,
        });
      });

      // Valid HTTPS URL is accepted
      const valid = UpdateStorefrontThemeRequestSchema.parse({
        brandName: 'Test Brand',
        logoUrl: 'https://example.com/logo.png',
        ...STYLE_PRESET_TOKENS.MODERNIST,
      });
      assert.equal(valid.brandName, 'Test Brand');
      assert.equal(valid.logoUrl, 'https://example.com/logo.png');
    });
  });
});
