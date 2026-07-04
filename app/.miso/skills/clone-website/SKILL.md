---
name: clone-website
description: Use when the user asks to clone, replicate, copy, rebuild, or reverse-engineer a website from one or more URLs into the current MISO Coder app.
argument-hint: "<target-url> [<target-url> ...]"
user-invocable: true
triggers:
  - "clone website"
  - "website clone"
  - "copy this site"
  - "rebuild this page"
  - "replicate this website"
  - "pixel perfect clone"
compatibility: opencode
metadata:
  source: .miso/skills/clone-website/SKILL.md
---

# Clone Website

You are about to reverse-engineer and rebuild the target URL as a high-fidelity website inside the current MISO Coder project.

Before inspecting the target, read `references/inspection-guide.md`. It defines the visual audit checklist and the research documents to produce.

This is not a generic frontend task. The job is to inspect the live site, extract real design evidence, then rebuild it in the existing sandbox stack.

Primary activation is automatic: when the user asks in natural language to clone, copy, rebuild, replicate, or reverse-engineer a website, load this skill and follow it. Slash-style invocation is optional convenience, not the main path.

This is not a strict two-phase process where everything is inspected before any code is written. Work section by section: inspect a section, write its spec, build it, then keep moving while preserving auditable research artifacts.

When multiple target URLs are provided, process them independently. Keep research, screenshots, downloaded assets, and component specs isolated by hostname or page slug so evidence from one site does not leak into another.

## MISO Coder Target Stack

Build the clone using this project's existing stack:

- React 19 + TypeScript
- Vite dev server
- Tailwind CSS v4
- shadcn/ui primitives already installed in `src/components/ui/`
- Radix primitives through shadcn/ui when useful
- `lucide-react` for generic interface icons
- local extracted SVG React components for target-specific brand/illustration icons
- static assets under `public/images`, `public/videos`, and `public/seo`
- app-owned React components under `src/components/`
- app-owned global/page styling in `src/index.css` and existing app entry files

Do not convert the app to Next.js. Do not add App Router files. Do not copy the upstream template scaffold, sync scripts, platform command files, or worktree assumptions. The target output is a MISO Coder React/Vite app.

Do not modify platform-managed files:

- `.miso/**`
- `src/lib/miso-sdk/**`
- `src/components/ui/**`
- `vite.config.ts`
- `api/_runtime_proxy.js`

## Scope Defaults

Clone exactly what is visible at the provided URL unless the user asks for customization.

- Fidelity: match layout, spacing, typography, colors, media, responsive behavior, and visible interactions.
- In scope: visual structure, real public content, assets, component structure, hover/click/scroll/time-driven behaviors.
- Out of scope by default: real backend behavior, authentication, payments, private account flows, SEO optimization, analytics, accessibility audit.
- Use mock data only for unavailable backend or session-specific data.

Do not build phishing, deceptive login capture, impersonation, or private-data access flows.

## Core Rule

Extraction and construction should proceed section by section. For each section:

1. Inspect the live page.
2. Write an auditable spec file.
3. Build the matching React component from that spec.
4. Compare visually and tighten.

Do not build from memory. Do not build a component before its spec exists.

If bounded helper agents are available, use them only after a spec exists. Give the helper the full spec contents inline, the screenshot path, local asset paths, target file path, and constraints. Do not tell helpers to infer from global docs or inspect the target again unless their explicit assignment is extraction.

## Guiding Principles

### Completeness Beats Speed

Every component needs enough evidence to implement without guessing:

- screenshot reference
- DOM structure
- exact computed styles
- real text
- real asset paths
- responsive behavior
- state and interaction behavior

If you are guessing a color, font size, padding, animation trigger, or image layer, extract more.

### Small Tasks, Exact Results

Break pages into sections. Break complex sections into smaller components.

A simple hero can be one component. A tabbed product section with multiple cards, hover states, and image overlays should be split into smaller specs and components.

If one component spec would become too large to keep precise, split it.

### Real Content, Real Assets

Use actual public text, images, videos, and SVGs from the target when legitimate for the user's request.

Layered assets matter. Inspect each visual container for:

- nested `img`
- `video`
- inline `svg`
- canvas
- `background-image`
- absolutely positioned overlays
- foreground mockup images layered over backgrounds

Missing one layer often makes the clone look fake even when the main layout is right.

### Foundation First

Before building sections, establish the target site's foundation in the MISO app:

- font families and fallbacks
- CSS variables and global design tokens
- section/container spacing patterns
- colors, gradients, shadows, radii
- shared keyframes and page-level motion
- extracted reusable SVG icons
- downloaded global assets
- TypeScript content shapes when repeated data exists

Use app-owned files such as `src/index.css`, `src/App.tsx`, `src/components/*`, `src/types/*`, and `public/*`.

### Extract Appearance And Behavior

A website is not a screenshot. Extract how it looks and how it behaves.

For meaningful elements, capture:

- appearance: exact computed CSS
- behavior: trigger, before state, after state, transition, easing, duration
- responsive behavior: desktop/tablet/mobile layouts
- content: text, labels, alt text, per-state data

Scroll first, then click, then hover. Many clone failures happen because a scroll-driven section is rebuilt as click-driven tabs, or a click-driven widget is mistaken for scroll behavior.

## Phase 1: Reconnaissance

Use `agent-browser` for browser inspection. If you have not used it in this task yet, read `.miso/skills/agent-browser/SKILL.md`.

Preflight:

1. Parse the request into one or more target URLs plus any customization constraints.
2. Normalize each URL and verify it opens in `agent-browser`.
3. Create artifact folders before extraction:

```bash
mkdir -p docs/research/components docs/design-references public/images public/videos public/seo scripts
```

For multiple targets, create per-target subfolders such as `docs/research/<hostname>/` and `docs/design-references/<hostname>/`.

For each target URL:

### Screenshots

Capture reference screenshots:

- desktop: 1440px
- tablet: 768px
- mobile: 390px
- key interaction states
- open menus, modals, dropdowns, tabs, accordions
- hover/active states when visible

Save screenshots under `docs/design-references/`. For multiple targets, isolate by hostname.

### Mandatory Interaction Sweep

Scroll sweep:

- Scroll slowly from top to bottom.
- Record header changes, sticky/fixed elements, reveal animations, parallax, snap points, scroll-driven tab changes, progress indicators, and theme transitions.
- Check for smooth-scroll libraries or custom scroll containers.

Click sweep:

- Click every interactive-looking control that changes the page UI.
- For tabs/pills/segmented controls, click every state and extract each state's content.
- Record modal/dropdown/accordion enter and exit behavior.

Hover sweep:

- Hover buttons, cards, images, links, nav items, icons, and menus.
- Record color, opacity, scale, shadow, underline, cursor, transform, and transition changes.

Responsive sweep:

- Inspect at 1440px, 768px, and 390px.
- Record approximate breakpoint widths and what changes at each one.

Write findings to:

- `docs/research/PAGE_TOPOLOGY.md`
- `docs/research/BEHAVIORS.md`

Also create the useful inspection outputs from `references/inspection-guide.md`:

- `docs/research/DESIGN_TOKENS.md`
- `docs/research/COMPONENT_INVENTORY.md`
- `docs/research/LAYOUT_ARCHITECTURE.md`
- `docs/research/INTERACTION_PATTERNS.md`
- `docs/research/TECH_STACK_ANALYSIS.md`

## Phase 2: Foundation Build

Build the foundation in the existing Vite app:

1. Update `src/index.css` with the target site's colors, typography, spacing, keyframes, scrollbar rules, smooth-scroll CSS, and page-level variables.
2. Update `src/App.tsx` or the current app composition file with the target page shell.
3. Create shared components under `src/components/`.
4. Create shared data/types under `src/types/` when repeated content appears.
5. Extract inline SVGs into named React components such as `SearchIcon`, `ArrowRightIcon`, or target-specific icon names.
6. Download global assets to `public/images`, `public/videos`, or `public/seo`.

Do not add dependencies just because the upstream site uses a library. Recreate with CSS/React first. Add a dependency only if the interaction would otherwise be materially worse and the user has asked for that level of fidelity.

## Asset Discovery Pattern

Use this in the target page to enumerate visible assets:

```javascript
JSON.stringify({
  images: [...document.querySelectorAll("img")].map((img) => ({
    src: img.currentSrc || img.src,
    alt: img.alt,
    width: img.naturalWidth,
    height: img.naturalHeight,
    parentClass: img.parentElement && img.parentElement.className,
    siblingImageCount: img.parentElement ? img.parentElement.querySelectorAll("img").length : 0,
    position: getComputedStyle(img).position,
    zIndex: getComputedStyle(img).zIndex
  })),
  videos: [...document.querySelectorAll("video")].map((video) => ({
    src: video.currentSrc || video.src || (video.querySelector("source") && video.querySelector("source").src),
    poster: video.poster,
    autoplay: video.autoplay,
    loop: video.loop,
    muted: video.muted
  })),
  backgroundImages: [...document.querySelectorAll("*")]
    .filter((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      return bg && bg !== "none";
    })
    .map((el) => ({
      url: getComputedStyle(el).backgroundImage,
      element: el.tagName + "." + String(el.className || "").split(" ")[0]
    })),
  svgCount: document.querySelectorAll("svg").length,
  fonts: [...new Set([...document.querySelectorAll("*")].slice(0, 200).map((el) => getComputedStyle(el).fontFamily))],
  favicons: [...document.querySelectorAll('link[rel*="icon"]')].map((link) => ({
    href: link.href,
    sizes: link.sizes && link.sizes.toString()
  }))
});
```

When batching downloads, create a small script in `scripts/`. Use stable local filenames and update specs with the local paths.

For many assets, download in small parallel batches, for example four requests at a time, with clear error handling and a summary of skipped or failed assets.

## Phase 3: Component Specification And Build

For each section in page order, write a spec before implementation.

Spec path:

```text
docs/research/components/<component-name>.spec.md
```

Spec template:

```markdown
# <ComponentName> Specification

## Overview
- Target file: `src/components/<ComponentName>.tsx`
- Screenshot: `docs/design-references/<screenshot-name>.png`
- Interaction model: static | hover-driven | click-driven | scroll-driven | time-driven | mixed

## DOM Structure
Describe the element hierarchy and important child elements.

## Computed Styles
Use exact values from getComputedStyle.

### Container
- display:
- width / max-width:
- padding:
- margin:
- background:
- border / radius:
- shadow:
- position / z-index:

### Text
- font-family:
- font-size:
- font-weight:
- line-height:
- color:
- letter-spacing:

## States And Behaviors
### <Behavior name>
- Trigger:
- State A:
- State B:
- Transition:
- Implementation approach:

## Per-State Content
List tab, accordion, carousel, or scroll state content.

## Assets
- Local image/video/icon paths:
- Layering notes:

## Text Content
Verbatim text from the target.

## Responsive Behavior
- Desktop 1440px:
- Tablet 768px:
- Mobile 390px:
- Breakpoint:
```

After writing the spec, implement the component in `src/components/` and assemble it into the app.

Use existing shadcn/ui primitives for buttons, dialogs, tabs, accordions, menus, tooltips, popovers, switches, sliders, and form controls when they fit the target. Do not modify the primitive files.

Before implementing or handing off a component, check:

- [ ] Spec file exists under `docs/research/components/<name>.spec.md`.
- [ ] Important CSS values came from `getComputedStyle()` or verified screenshot measurement.
- [ ] Interaction model is identified: static, hover, click, scroll, time, or mixed.
- [ ] Stateful content includes every tab, accordion, carousel, modal, and active state.
- [ ] Scroll-driven behavior includes trigger threshold, before/after styles, and transition.
- [ ] Hover/focus states include before/after values and timing.
- [ ] Images include overlays, nested images, and background layers.
- [ ] Responsive behavior covers desktop and mobile at minimum.
- [ ] Text content is verbatim unless the user requested customization.
- [ ] The component scope is small enough that implementation does not require guessing.

## Per-Component Extraction Pattern

Use this in the target page for each component container:

```javascript
(function(selector) {
  const el = document.querySelector(selector);
  if (!el) return JSON.stringify({ error: "Element not found: " + selector });
  const props = [
    "fontSize","fontWeight","fontFamily","lineHeight","letterSpacing","color",
    "textTransform","textDecoration","backgroundColor","background",
    "padding","paddingTop","paddingRight","paddingBottom","paddingLeft",
    "margin","marginTop","marginRight","marginBottom","marginLeft",
    "width","height","maxWidth","minWidth","maxHeight","minHeight",
    "display","flexDirection","justifyContent","alignItems","gap",
    "gridTemplateColumns","gridTemplateRows",
    "borderRadius","border","borderTop","borderBottom","borderLeft","borderRight",
    "boxShadow","overflow","overflowX","overflowY",
    "position","top","right","bottom","left","zIndex",
    "opacity","transform","transition","cursor",
    "objectFit","objectPosition","mixBlendMode","filter","backdropFilter",
    "whiteSpace","textOverflow","WebkitLineClamp"
  ];
  function extractStyles(element) {
    const cs = getComputedStyle(element);
    const styles = {};
    props.forEach((prop) => {
      const value = cs[prop];
      if (value && value !== "none" && value !== "normal" && value !== "auto" && value !== "0px" && value !== "rgba(0, 0, 0, 0)") {
        styles[prop] = value;
      }
    });
    return styles;
  }
  function walk(element, depth) {
    if (depth > 4) return null;
    const children = [...element.children];
    return {
      tag: element.tagName.toLowerCase(),
      classes: String(element.className || "").split(" ").slice(0, 5).join(" "),
      text: element.childNodes.length === 1 && element.childNodes[0].nodeType === 3 ? element.textContent.trim().slice(0, 200) : null,
      styles: extractStyles(element),
      image: element.tagName === "IMG" ? {
        src: element.src,
        alt: element.alt,
        naturalWidth: element.naturalWidth,
        naturalHeight: element.naturalHeight
      } : null,
      childCount: children.length,
      children: children.slice(0, 20).map((child) => walk(child, depth + 1)).filter(Boolean)
    };
  }
  return JSON.stringify(walk(el, 0), null, 2);
})("SELECTOR");
```

For multi-state components, capture the same selector before and after each state change and document the diff.

For scroll-dependent elements, capture the initial state, scroll past the trigger, recapture the same selector, and record the scroll position or intersection condition. For tabbed or stateful content, activate every state and extract both content and style changes.

## Phase 4: Page Assembly

After sections are implemented:

- Import and order all section components in the page shell.
- Recreate page-level layout: scroll containers, sticky layers, z-index structure, background layers.
- Connect extracted content to component props or local data arrays.
- Implement page-level behaviors: scroll snap, reveal animations, scroll-driven state, theme transitions, smooth-scroll feel.
- Keep the implementation in the Vite/React app structure.

## Phase 5: Visual QA

Do not declare the clone complete after code is written. Compare the generated app with the target:

1. Open the target site and local preview.
2. Capture comparable desktop screenshots for target and local preview.
3. Compare desktop section by section.
4. Capture comparable mobile screenshots for target and local preview.
5. Compare mobile section by section.
6. Test every documented interaction: scroll transitions, tabs, menus, accordions, carousels, hover states, responsive layout.
7. If something is wrong, check whether the spec was incomplete or the implementation missed the spec.
8. Re-extract and update the spec when the original evidence was incomplete.

## What Not To Do

- Do not build click-based tabs when the original is scroll-driven, or the reverse.
- Do not extract only the default state.
- Do not miss overlay or layered images.
- Do not build fake HTML mockups of real videos, canvas, or Lottie animations unless the user accepts the limitation.
- Do not approximate CSS classes when exact computed values are available.
- Do not bundle unrelated sections into one component.
- Do not give a helper agent too much scope.
- Do not tell a helper to "see DESIGN_TOKENS.md" when the component spec should include the needed values inline.
- Do not skip responsive extraction.
- Do not modify platform-managed files.
- Do not convert this sandbox to Next.js.
- Do not add backend/server frameworks for visual cloning.

## Completion Report

When done, report:

- target URL(s)
- sections built
- components created
- spec files written
- assets downloaded
- visual QA result
- known gaps or intentionally simplified behavior
