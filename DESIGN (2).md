---
name: Emerald Charge Admin System
colors:
  surface: '#f8faf9'
  surface-dim: '#d8dad9'
  surface-bright: '#f8faf9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f3'
  surface-container: '#eceeed'
  surface-container-high: '#e6e9e8'
  surface-container-highest: '#e1e3e2'
  on-surface: '#191c1c'
  on-surface-variant: '#404946'
  inverse-surface: '#2e3131'
  inverse-on-surface: '#eff1f0'
  outline: '#707976'
  outline-variant: '#c0c8c5'
  surface-tint: '#36675c'
  primary: '#00362d'
  on-primary: '#ffffff'
  primary-container: '#1a4d43'
  on-primary-container: '#8abdb0'
  inverse-primary: '#9ed1c3'
  secondary: '#b51a1e'
  on-secondary: '#ffffff'
  secondary-container: '#d93633'
  on-secondary-container: '#fffbff'
  tertiary: '#402a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#5d3f00'
  on-tertiary-container: '#eba500'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b9eddf'
  primary-fixed-dim: '#9ed1c3'
  on-primary-fixed: '#00201a'
  on-primary-fixed-variant: '#1c4f45'
  secondary-fixed: '#ffdad6'
  secondary-fixed-dim: '#ffb4ac'
  on-secondary-fixed: '#410003'
  on-secondary-fixed-variant: '#93000e'
  tertiary-fixed: '#ffdeac'
  tertiary-fixed-dim: '#ffba38'
  on-tertiary-fixed: '#281900'
  on-tertiary-fixed-variant: '#604100'
  background: '#f8faf9'
  on-background: '#191c1c'
  surface-variant: '#e1e3e2'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  gutter-md: 16px
  margin-sm: 12px
  section-gap: 32px
---

## Brand & Style

The design system for "Emerald Charge" is built upon a foundation of **Corporate Modernism** with a focus on reliability and industrial precision. It is designed for station service providers who require a clear, high-trust interface to manage EV charging infrastructure and energy flow.

The aesthetic combines deep, earthy tones with a clean, systematic layout. It evokes a sense of environmental responsibility through its primary palette while maintaining the urgency and clarity required for industrial management through its secondary and tertiary accents. The visual language uses soft-cornered containers and subtle depth to make complex data-heavy dashboards feel approachable and organized.

## Colors

This color palette is optimized for a functional administrative environment:

*   **Primary (Deep Forest Green):** Used for core navigation, primary actions, and representing "active" or "stable" charging states.
*   **Secondary (Terracotta Red):** Reserved for alerts, critical errors, and stop-actions. Its warm, earthy base ensures it is visible without being jarring against the deep green.
*   **Tertiary (Amber Yellow):** Utilized for warnings, maintenance indicators, and pending states.
*   **Neutral (Cool Gray-Green):** The background (#F5F7F6) and surface colors are slightly tinted with green to maintain harmony with the primary brand color, reducing eye strain during long-form monitoring.

## Typography

The typography system relies exclusively on **Inter** to provide a highly legible, neutral, and systematic feel suitable for data visualization and technical logs.

- **Headlines:** Use tighter letter spacing and heavier weights to create a strong hierarchy in dashboard summaries.
- **Body:** Standardized at 16px for optimal readability in data tables and status descriptions.
- **Labels:** Utilized for table headers, small metadata, and button text. The `label-lg` style uses uppercase styling to differentiate structural labels from content.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid Grid** system:
- **Sidebar:** A fixed 280px sidebar for primary navigation.
- **Main Content:** A fluid 12-column grid that expands to fill the remaining viewport, with a maximum container width of 1600px for ultra-wide monitors.
- **Gutter & Margins:** A consistent 16px (gutter-md) between grid items and 24px (container-padding) around the main viewport edges.

On mobile devices, the 12-column grid collapses into a single column, and container padding is reduced to 16px to maximize screen real estate for charging station maps and status lists.

## Elevation & Depth

This design system uses a **Tonal Layering** approach combined with **Ambient Shadows** to establish hierarchy:

1.  **Level 0 (Background):** The neutral `#F5F7F6` surface.
2.  **Level 1 (Cards/Containers):** Pure white (#FFFFFF) surfaces with a very soft, diffused shadow (0px 4px 20px rgba(26, 77, 67, 0.05)). The shadow is slightly tinted with the primary green to maintain the brand's atmosphere.
3.  **Level 2 (Overlays/Dropdowns):** Increased shadow spread and opacity (0px 8px 30px rgba(26, 77, 67, 0.12)) to indicate temporary interaction layers.

Avoid heavy borders; use subtle 1px strokes in a light gray-green (#E0E7E5) only when cards sit on white backgrounds or require clear internal partitioning.

## Shapes

The shape language is consistently **Rounded**, striking a balance between industrial utility and modern software aesthetics.

- **Standard Components:** Buttons, input fields, and small cards use a 0.5rem (8px) radius.
- **Large Containers:** Main dashboard widgets and navigation panels use a 1rem (16px) radius to create a softer, more contemporary frame for the data.
- **Interactive States:** Indicators like active status pills or selection markers utilize the `rounded-xl` (1.5rem / 24px) setting for a distinct "pill" look that stands out against rectangular grid items.

## Components

### Buttons
- **Primary:** Solid `#1A4D43` with white text. High contrast, used for the main action in any view.
- **Secondary:** Outlined with a 1px stroke of the primary color or a light gray fill.
- **Destructive:** Solid `#C62828` for "Emergency Stop" or "Delete Station."

### Input Fields
- Backgrounds should be slightly off-white or the neutral color to recede.
- Focus states must use a 2px primary color ring with a subtle outer glow.

### Status Chips (Station State)
- **Charging:** Primary green background with low opacity, dark green text.
- **Fault:** Secondary red background with low opacity, dark red text.
- **Available:** Tertiary amber background with low opacity, dark amber text.

### Cards
- Dashboard widgets must have a consistent 24px internal padding.
- Headers within cards should use the `label-lg` typography style for categorization.

### Navigation
- Vertical sidebar with high-contrast icons. The "Active" state is marked by a solid primary-colored vertical bar on the left edge of the menu item.