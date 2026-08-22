# PromotorFlow — Design System Specification

## Visual Identity: Ultra-Sleek Modern SaaS (Linear / Raycast / Stripe Inspired)

PromotorFlow adopts a modern, high-precision interface aesthetic: a crisp alabaster canvas (`#F8FAFC`), deep slate typography (`#0F172A`), electric teal and cyan accents (`#0D9488` / `#06B6D4`), hairline borders (`#E2E8F0`), and multi-layered ambient elevation shadows.

---

## 1. Palette & Surface Tokens

### Primary Brand Accents (Electric Teal & Cyan Aura)
* `--color-primary`: `#0D9488` (Primary Action & Active Brand)
* `--color-primary-hover`: `#0F766E`
* `--color-primary-active`: `#115E59`
* `--color-primary-light`: `#F0FDFA` (Tinted Background Surfaces)
* `--color-primary-border`: `#99F6E4`
* `--color-primary-glow`: `rgba(13, 148, 136, 0.16)`

### Canvas & Background Surfaces
* `--color-canvas`: `#F8FAFC` (Modern Cool Alabaster Ground)
* `--color-canvas-subtle`: `#F1F5F9`
* `--color-surface`: `#FFFFFF` (Pure White Card Ground)
* `--color-surface-hover`: `#F8FAFC`
* `--color-surface-active`: `#F1F5F9`

### Dividers & Hairlines
* `--color-divider`: `#E2E8F0` (High-Precision Hairline Border)
* `--color-border-strong`: `#CBD5E1`
* `--color-border-subtle`: `#F1F5F9`

### Deep Slate Typography
* `--color-text-primary`: `#0F172A` (Primary Display & Headings, 800–900 weight)
* `--color-text-secondary`: `#334155` (Body Text, 500–600 weight)
* `--color-text-tertiary`: `#64748B` (Secondary Metadata & Timestamps)
* `--color-text-subtle`: `#94A3B8` (Captions & Placeholders)
* `--color-text-inverse`: `#FFFFFF`

### Semantic Feedback
* `--color-success`: `#059669` / `#ECFDF5` / `#A7F3D0` (Completed & On-Time)
* `--color-warning`: `#D97706` / `#FFFBEB` / `#FDE68A` (Attention Required)
* `--color-danger`: `#E11D48` / `#FFF1F2` / `#FECDD3` (Overdue Actions)
* `--color-info`: `#0284C7` / `#F0F9FF` / `#BAE6FD` (Informational Badges)

---

## 2. Typography & Spatial Rhythm

* **Font Stack**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
* **Headings**: Tight tracking (`letter-spacing: -0.035em` for H1, `-0.02em` for H2/H3).
* **Body Measure**: `65–75ch` max width with `line-height: 1.55`.
* **Tabular Numbers**: `.tabular-nums` (`font-variant-numeric: tabular-nums`) on all counts, metrics, timestamps, and prices.

---

## 3. Elevation & Layering
* `--shadow-xs`: `0 1px 2px rgba(15, 23, 42, 0.04)`
* `--shadow-sm`: `0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)`
* `--shadow-md`: `0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)`
* `--shadow-lg`: `0 12px 28px -4px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)`
* `--shadow-sheet`: `0 -8px 32px rgba(15, 23, 42, 0.12)`

---

## 4. Geometry & Radii
* Buttons & Inputs: `8px` (`--radius-sm`) to `12px` (`--radius-md`)
* Cards & Modals: `16px` (`--radius-lg`) to `22px` (`--radius-xl`)
* Floating Action Pills: `9999px` (`--radius-full`)

---

## 5. Design Do's and Don'ts

### Do
* Use high-contrast primary text on `#FFFFFF` cards with 1px `#E2E8F0` borders.
* Use 48px touch targets for all primary buttons and WhatsApp launchers.
* Use themed text selection (`::selection`) and custom scrollbars.
* Use smooth spring transition curves (`cubic-bezier(0.16, 1, 0.3, 1)`).

### Don't
* Never use decorative gradient text.
* Never use zero-blur hard block drop shadows.
* Never use kicker/eyebrow labels above headings.
* Never use emoji icons in place of drawn SVGs.
