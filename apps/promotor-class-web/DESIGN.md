---
name: PromotorClass
description: Client Education OS converting learning activities into actionable business signals
colors:
  primary: "#286344"
  primary-hover: "#1e4b33"
  primary-light: "#eef5f1"
  primary-border: "#b8d4c5"
  canvas: "#F7F7F5"
  surface: "#FFFFFF"
  surface-hover: "#F0F0ED"
  divider: "#D7D8D3"
  text-main: "#20211F"
  text-muted: "#73756F"
  text-subtle: "#9A9C97"
  text-inverse: "#FFFFFF"
  status-success: "#167A68"
  status-success-bg: "#EAF5F2"
  status-warning: "#C07000"
  status-warning-bg: "#FFF8EB"
  status-danger: "#D32F2F"
  status-danger-bg: "#FDF2F2"
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
    letterSpacing: "-0.04em"
  editorial:
    fontFamily: "Georgia, serif"
    fontStyle: "italic"
    fontWeight: 500
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  xl: "20px"
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

PromotorClass follows the **Quiet Utility** design direction with Direct-Response conversion mechanics. The interface emphasizes content, human connection, and high contrast over superficial decorative gradients or artificial complexity.

## Colors

- **Primary Emerald (`#286344`)**: Anchor brand color representing growth, trust, and calm authority.
- **Warm Canvas (`#F7F7F5`)**: Soothing off-white neutral background reducing cognitive fatigue.
- **Surface Pure White (`#FFFFFF`)**: Card and content container surface.
- **Charcoal Text (`#20211F`)**: High legibility body and headline color.
- **Muted Text (`#73756F`)**: Subtitles and secondary metadata.

## Typography

- **System Display / Sans**: Modern, precise, crisp sans-serif with negative tracking (`-0.04em`) for headlines.
- **Editorial Accent**: Georgia / serif italics for key phrases in headlines to add warmth, human touch, and craft distinction.
- **Tabular Figures**: Tabular numerals on timestamps, stats, and prices.

## Layout

- **Desktop**: Max container width `1140px` with 24px edge padding. Asymmetric and 2-column grids for feature and conversion blocks.
- **Mobile PWA Standard**: Single-column responsive layout, touch target minimum `44px` (primary actions `48px-52px`), fixed sticky action bars on sales surfaces.

## Elevation & Depth

- **Subtle Offset Shadows**: `0 1px 2px rgba(0, 0, 0, 0.05)` (small), `0 4px 12px rgba(0, 0, 0, 0.08)` (medium), `0 12px 36px rgba(0, 0, 0, 0.05)` (cards/calculators).
- Zero offset halos and harsh block shadows are strictly avoided.

## Shapes

- Radius follows a consistent hierarchy: 6px (micro badges), 10px-12px (buttons & inputs), 16px-24px (major cards & simulator frames).

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
