---
name: PromotorClass
description: Client Education OS converting learning activities into actionable business signals
colors:
  primary: "#059669"
  primary-hover: "#047857"
  primary-light: "#ECFDF5"
  primary-border: "#A7F3D0"
  canvas: "#F8FAFC"
  surface: "#FFFFFF"
  surface-hover: "#F8FAFC"
  divider: "#E2E8F0"
  text-main: "#0F172A"
  text-muted: "#64748B"
  text-subtle: "#94A3B8"
  text-inverse: "#FFFFFF"
  status-success: "#059669"
  status-success-bg: "#ECFDF5"
  status-warning: "#D97706"
  status-warning-bg: "#FFFBEB"
  status-danger: "#E11D48"
  status-danger-bg: "#FFF1F2"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "clamp(36px, 5.5vw, 64px)"
    fontWeight: 850
    lineHeight: 1.05
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "clamp(28px, 4vw, 40px)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  editorial:
    fontFamily: "Georgia, serif"
    fontStyle: "italic"
    fontWeight: 500
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "14.5px"
    lineHeight: 1.55
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "46px"
---

## Overview

PromotorClass follows the **Ultra-Sleek Modern SaaS** design direction (Linear/Stripe-inspired) with Direct-Response conversion mechanics. The interface emphasizes high-precision hairline borders, crisp slate typography, modern emerald accents, and multi-layered tactile shadows.

## Colors

- **Primary Vivid Emerald (`#059669`)**: Anchor brand color representing growth, clarity, and authority.
- **Modern Canvas (`#F8FAFC`)**: Crisp, soothing off-white neutral background reducing cognitive fatigue.
- **Surface Pure White (`#FFFFFF`)**: Floating card and content container surface with subtle ambient shadows.
- **Deep Slate Text (`#0F172A`)**: High legibility body and headline color.
- **Muted Slate Text (`#64748B`)**: Subtitles and secondary metadata.

## Typography

- **System Display / Sans**: Modern, precise, crisp sans-serif with negative tracking (`-0.035em`) for headlines.
- **Editorial Accent**: Georgia / serif italics for key phrases in headlines to add warmth, human touch, and craft distinction.
- **Tabular Figures**: Tabular numerals on timestamps, stats, and prices.

## Layout

- **Desktop**: Max container width `1140px` with 24px edge padding. Asymmetric and 2-column grids for feature and conversion blocks.
- **Mobile PWA Standard**: Single-column responsive layout, touch target minimum `44px` (primary actions `48px-52px`), fixed sticky action bars on sales surfaces.

## Elevation & Depth

- **Multi-layered Ambient Shadows**: `0 1px 3px rgba(15, 23, 42, 0.06)` (small), `0 4px 12px -2px rgba(15, 23, 42, 0.06)` (medium), `0 12px 28px -4px rgba(15, 23, 42, 0.08)` (large).
- Zero offset halos and harsh block shadows are strictly avoided.

## Shapes

- Radius follows a consistent hierarchy: 6px (micro badges), 10px-12px (buttons & inputs), 16px-22px (major cards & simulator frames).

## Components

- **Direct-Response Hero**: Focused value proposition with dual-action CTA and social proof metrics strip.
- **Interactive 3-Step Engine Demo**: Tabbed interactive walkthrough demonstrating the Learner -> Intent Signal -> WhatsApp loop.
- **ROI & Conversion Calculator**: Real-time slider calculating high-intent leads and revenue uplift.
- **Problem-Agitation Matrix**: High-contrast comparison table.
- **Frictionless Registration Form**: WhatsApp-first instant registration box.

## Do's and Don'ts

### Do's
- Lead directly with the headline without redundant kickers/eyebrows.
- Use Georgia serif italics for intentional editorial emphasis.
- Provide interactive live simulations to demonstrate mechanisms rather than just claiming them.
- Keep mobile touch targets at least 44px with generous thumb clearance.

### Don'ts
- Do not use generic gradient text or rainbow halos.
- Do not use unicode emoji as an icon system; use authored clean SVGs.
- Do not make repeated same-size icon cards.
- Do not require passwords for learner registrations.
