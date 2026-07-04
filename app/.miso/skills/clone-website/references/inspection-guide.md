# Website Inspection Guide

Use this checklist when reverse-engineering a target website with `agent-browser` or browser DevTools. The goal is to capture enough evidence that implementation can proceed from documented facts instead of visual guessing.

## Phase 1: Visual Audit

### Screenshots To Capture

- [ ] Every distinct page or page state in scope
- [ ] Desktop, tablet, and mobile viewport screenshots
- [ ] Dark mode variants, if present
- [ ] Light mode variants, if present
- [ ] Key interaction states: hover, active, selected, expanded, open menus, modals
- [ ] Loading and skeleton states
- [ ] Empty states
- [ ] Error states

### Design Tokens To Extract

- [ ] Colors: background, text, muted text, accent, border, hover, error, success, warning
- [ ] Typography: font families, sizes, weights, line heights, letter spacing
- [ ] Spacing: padding and margin patterns; identify recurring scales such as 4, 8, 12, 16, 24, 32
- [ ] Border radius: buttons, cards, avatars, inputs, modals
- [ ] Shadows and elevation: cards, dropdowns, modals, overlays
- [ ] Breakpoints: exact widths where layout shifts
- [ ] Icons: library, custom SVGs, sizes, stroke widths
- [ ] Avatars: size, shape, image fallback behavior
- [ ] Buttons: primary, secondary, ghost, icon-only, destructive, disabled
- [ ] Inputs: fields, textareas, selects, checkboxes, toggles, validation states

## Phase 2: Component Inventory

For each distinct UI component, document:

1. Name: what the component should be called.
2. Structure: DOM hierarchy and child components.
3. Variants: sizes, colors, layouts, and semantic variants.
4. States: default, hover, focus, active, disabled, loading, error, empty.
5. Responsive behavior: how it changes at each breakpoint.
6. Interactions: click, hover, focus, keyboard navigation, scroll, time.
7. Animations: transition properties, durations, easing, entrance and exit behavior.

Common components to inspect:

- Navigation: top bar, sidebar, bottom bar, breadcrumbs
- Cards and list items
- Buttons and links
- Forms and inputs
- Modals and dialogs
- Dropdowns and menus
- Tabs and segmented controls
- Avatars and user badges
- Loading skeletons
- Toast notifications
- Tooltips and popovers
- Carousels, marquees, accordions, and scroll-driven sections

## Phase 3: Layout Architecture

- [ ] Grid system: CSS Grid, Flexbox, fixed widths, or mixed layout
- [ ] Column layout at each breakpoint
- [ ] Main content max-width and container gutters
- [ ] Sticky or fixed elements: header, sidebar, floating buttons
- [ ] Z-index layers: navigation, modals, tooltips, overlays
- [ ] Scroll behavior: snap points, parallax, infinite scroll, pagination, virtual lists
- [ ] Page-level background layers, gradients, videos, or canvas effects

## Phase 4: Technical Stack Analysis

- [ ] Framework hints: React, Vue, Angular, Next, Nuxt, Svelte, static HTML
- [ ] CSS approach: Tailwind, CSS Modules, CSS variables, Styled Components, Emotion, plain CSS
- [ ] State patterns: tabs, accordions, carousels, filters, live updates
- [ ] API patterns visible in public network requests: REST, GraphQL, static JSON
- [ ] Font loading: Google Fonts, self-hosted fonts, system fonts
- [ ] Image strategy: CDN, lazy loading, srcset, WebP, AVIF
- [ ] Animation library: CSS transitions, Framer Motion, GSAP, Lenis, Lottie, canvas

## Phase 5: Documentation Output

After inspection, create the useful subset of these files under `docs/research/`:

1. `DESIGN_TOKENS.md`: colors, typography, spacing, radii, shadows, breakpoints.
2. `COMPONENT_INVENTORY.md`: each component with structure, variants, states, and responsive notes.
3. `LAYOUT_ARCHITECTURE.md`: page sections, grid/container rules, sticky layers, z-index map.
4. `INTERACTION_PATTERNS.md`: animations, transitions, hover states, scroll/click/time-driven behavior.
5. `TECH_STACK_ANALYSIS.md`: what the target appears to use and the Vite/React equivalents chosen for this app.

These files do not replace per-component specs. They provide global context; each implemented section still needs its own `docs/research/components/<name>.spec.md`.
