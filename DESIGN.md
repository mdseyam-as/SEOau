# DESIGN.md

## Purpose

This document describes the current UI of the application as implemented in code, so another AI agent can recreate it as closely as possible.

This is not a generic design direction. It is a reconstruction spec for the current product UI.

If the agent must choose between:

- inventing a nicer design
- matching the current shipped design

it must choose matching the current shipped design.

## Source of truth

Primary files:

- [index.css](./index.css)
- [App.tsx](./App.tsx)
- [components/Header.tsx](./components/Header.tsx)
- [components/ProjectHeader.tsx](./components/ProjectHeader.tsx)
- [components/ProjectList.tsx](./components/ProjectList.tsx)
- [components/EmptyState.tsx](./components/EmptyState.tsx)
- [components/MonitoringPanel.tsx](./components/MonitoringPanel.tsx)
- [components/CompetitorWatcherPanel.tsx](./components/CompetitorWatcherPanel.tsx)
- [components/ProjectSitePanel.tsx](./components/ProjectSitePanel.tsx)

If this document and the code disagree, the code wins.

## Design intent

The UI is a premium dark productivity interface with bright emerald/cyan highlights.

Core feel:

- dark atmospheric workspace
- glassy and blurred layers
- rounded oversized cards
- white and slate text on dark surfaces
- bright emerald primary actions
- soft glows instead of hard borders
- strong visual separation between “workspace shell” and “content cards”

The app should feel:

- modern
- premium
- calm
- slightly futuristic
- dense enough for power users
- readable inside Telegram WebApp dark framing

## Global layout

The app root uses a dark animated mesh background.

From [App.tsx](./App.tsx):

- root wrapper uses `min-h-screen bg-mesh-animated text-slate-100 font-sans`

From [index.css](./index.css):

- `.bg-mesh-animated`
  - base gradient: `#0B0F19 -> #1a1f2e -> #0B0F19`
  - animated background-size `400% 400%`
  - animated radial overlays in emerald, sky, and purple/pink tones

This means:

- never place the full app on a flat black background
- there should always be subtle spatial depth in the page background

## Core tokens

Defined in `:root` in [index.css](./index.css).

### Brand colors

- Brand green: `rgb(0 220 130)` visually used as emerald accents and glow
- Accent blue: `rgb(56 189 248)`
- Dark background: `rgb(11 15 25)`
- Supporting purple/pink tokens exist but are secondary

### Backgrounds

- `--bg-primary`: `11 15 25`
- `--bg-secondary`: `21 25 37`
- `--bg-tertiary`: `26 31 46`
- `--bg-elevated`: white

### Text

- Main dark-surface text: white
- Secondary dark-surface text: slate-300 / slate-400 style
- Light-surface text: slate-900 / slate-700

### Radius

The product consistently prefers large radii:

- small controls: `rounded-xl` to `rounded-2xl`
- cards: `rounded-[22px]` to `rounded-[28px]`
- pills/badges: `rounded-full`

Anything boxy or sharp-cornered is wrong.

## Typography

Typography is not expressive/editorial. It is clean sans-serif product typography.

The app uses Tailwind `font-sans` and utility-based sizing.

Important typography helpers from [index.css](./index.css):

- `.text-display`
  - `clamp(1.5rem, 4vw, 2.5rem)`
  - `font-weight: 700`
  - `line-height: 1.2`
  - `letter-spacing: -0.02em`
- `.text-title`
  - `clamp(1.125rem, 3vw, 1.5rem)`
  - `font-weight: 600`
  - `line-height: 1.3`
  - `letter-spacing: -0.01em`
- `.text-body`
  - `clamp(0.875rem, 2vw, 1rem)`
  - `line-height: 1.6`

In practice:

- page titles: bold, white or slate-900, slightly tight tracking
- section titles: `text-lg` or `text-xl`, semibold or bold
- body copy: `text-sm` or `text-base`, slate-300 on dark surfaces
- labels: tiny uppercase, `text-[11px]`, large tracking

## Surface system

The UI is built from a small number of reusable surface recipes.

### 1. Main dark content card

Class:

- `.app-dark-card`

Definition:

- `rounded-[24px]`
- `border border-white/10`
- `background: linear-gradient(180deg, rgba(15,23,42,0.88), rgba(15,23,42,0.72))`
- `backdrop-blur-xl`
- `shadow-[0_24px_60px_rgba(2,6,23,0.35)]`

Use this for:

- project workspace hero cards
- monitoring panels
- competitor watcher sections
- lists
- empty states
- modal bodies in dark mode

### 2. Main light shell card

Class:

- `.app-shell-card`

Definition:

- near-white gradient surface
- subtle inner highlight
- stronger soft shadow
- decorative emerald/sky radial overlays via `::before`

Use this for:

- premium light containers
- light summary shells
- areas that need contrast against the dark app background

### 3. Light card

Class:

- `.app-light-card`

Use for:

- lighter sub-panels
- soft high-contrast content blocks

### 4. Light soft card

Class:

- `.app-light-soft`

Use for:

- smaller lighter supporting panels
- softer containers inside light areas

## Buttons

Buttons are oversized, rounded, tactile, and slightly lifted.

### Primary button

Class:

- `.app-btn-primary`

Recipe:

- emerald -> teal -> sky gradient
- white text
- `rounded-2xl`
- medium-heavy shadow in emerald
- hover lifts upward slightly
- active scales down slightly

Use for:

- create
- save
- primary CTA
- scan / generate actions when they are the dominant action

### Secondary light button

Class:

- `.app-btn-secondary`

Recipe:

- white background
- slate text
- subtle border and gray shadow

Use for:

- light-surface secondary actions

### Dark secondary button

Class:

- `.app-btn-dark`

Recipe:

- white/5 translucent fill
- white/10 border
- white text
- slight lift on hover

Use for:

- secondary actions inside dark cards

### Danger buttons

Danger buttons are not based on the generic button helpers. They are inline utility recipes:

- red border with low-opacity red background
- red text
- hover strengthens red fill slightly

Use for delete and destructive actions.

## Form controls

This app now uses two levels of input styling.

### Legacy dark input

Class:

- `.app-input-dark`

Recipe:

- `rounded-2xl`
- `border-white/10`
- `bg-white/5`
- white text
- slate placeholder
- emerald focus ring

This still exists in parts of the app.

### Preferred monitoring-module field shell

Used in:

- [components/MonitoringPanel.tsx](./components/MonitoringPanel.tsx)
- [components/CompetitorWatcherPanel.tsx](./components/CompetitorWatcherPanel.tsx)
- [components/ProjectSitePanel.tsx](./components/ProjectSitePanel.tsx)

Exact pattern:

- outer wrapper:
  - `rounded-[20px]`
  - `border border-white/12`
  - `bg-[linear-gradient(180deg,rgba(2,6,23,0.32),rgba(15,23,42,0.72))]`
  - `px-4 py-3`
  - inset highlight shadow and soft dark drop shadow
- inner input/select/textarea:
  - transparent background
  - no own border
  - white text
  - slate placeholder

Field labels:

- uppercase
- `text-[11px]`
- `font-semibold`
- `tracking-[0.16em]`
- `text-slate-400`
- margin bottom `0.5rem`

This is the preferred input style for the whole Monitoring family.

### Selects

Selects should not look like browser defaults. In the current UI they are:

- wrapped in the same dark shell as inputs
- transparent inside
- white text
- dropdown options can use dark-on-light defaults inside the browser popup

## Badges and pills

Badges are everywhere and define state.

### Section badge

Common section badge pattern:

- inline-flex
- rounded-full
- uppercase
- tiny text (`11px`)
- generous tracking (`0.14em` to `0.18em`)
- low-opacity emerald or white tint background

Examples:

- “Monitoring”
- “Competitor Watcher”
- “Модуль "Мы"”
- “Workspace”
- “App”

### Status pills

For active/paused/severity:

- rounded-full
- text-xs
- thin border
- low-opacity fill

Severity mapping:

- critical: red
- warning: amber
- info: sky

Active state mapping:

- active: emerald tint
- paused: white/5 tint

## Header design

From [components/Header.tsx](./components/Header.tsx):

- sticky top header
- semi-transparent dark gradient background
- strong blur
- bottom border `border-white/10`
- shadow downward into content

Logo block:

- rounded square icon surface
- emerald/sky translucent gradient
- white dashboard icon
- brand title in white
- small `App` badge in emerald

Header should feel:

- premium
- compact
- persistent
- not too tall

## Project header and drawer navigation

From [components/ProjectHeader.tsx](./components/ProjectHeader.tsx):

This is a light card sitting inside the dark workspace.

Structure:

- left side: breadcrumbs + project name
- right side:
  - current mode card
  - dark glossy burger button

Burger button:

- dark glossy gradient from near-black to dark slate
- white text
- internal radial sheen
- green status dot on larger screens

Drawer:

- slides in from the right
- has a light premium background with faint radial color glows
- overlay behind it is darkened and lightly blurred
- cards in drawer use colorful gradients per feature
- `Monitoring` is a parent item with expanding sub-items

Navigation rule:

- primary modules are visually card-like
- monitoring family is grouped under one expandable section

## Project list screen

From [components/ProjectList.tsx](./components/ProjectList.tsx):

Hero card:

- dark card
- badge “Workspace”
- large title “Мои проекты”
- emerald/cyan icon tile
- primary CTA button on the right

Project cards:

- dark cards
- hover raises card slightly
- subtle emerald glow blob appears in top-right on hover
- top-left icon tile uses emerald/cyan gradient
- delete action is subtle until hover
- project title shifts toward emerald on hover
- bottom row shows date and an “Открыть” affordance sliding in

Create project modal:

- dark modal card
- top 1px accent bar in emerald -> sky -> pink
- white title and slate description
- dark inputs
- dark cancel button + primary create button

## Empty states

From [components/EmptyState.tsx](./components/EmptyState.tsx):

Pattern:

- centered inside `app-dark-card`
- large rounded icon surface
- icon color depends on variant
- title in white
- supporting text in slate-300

Variants:

- default
- locked
- premium

Premium variant uses purple/pink gradient accents, but this is secondary to the app’s emerald identity.

## Monitoring family design

The three related modules:

- SEO Monitoring
- Competitors
- Мы

must feel like the same family.

Shared rules across these three modules:

- main wrapper uses `app-dark-card`
- top hero section includes blurred accent circles
- small tinted section badge
- bold white heading with icon
- KPI summary cards on the right
- form area is inside an inner dark translucent rounded panel
- field-shell controls are used instead of plain inputs
- supporting cards use gradients from very low-opacity white to dark slate, never flat gray

### SEO Monitoring

From [components/MonitoringPanel.tsx](./components/MonitoringPanel.tsx):

Top block:

- section badge “Monitoring”
- heading “SEO Monitoring + Alerts”
- 4 KPI cards: URL / Active / Critical / Warning
- inner form panel titled “Добавить URL в мониторинг”

URL cards:

- severity badge
- active badge
- frequency badge
- title/url block
- small meta cells
- action row on the right
- expandable history/diff section below

### Competitor Watcher

From [components/CompetitorWatcherPanel.tsx](./components/CompetitorWatcherPanel.tsx):

Top block:

- section badge “Competitor Watcher”
- heading “Growth Intelligence по конкурентам”
- KPI cards
- inner form panel titled “Добавить конкурента”

List column:

- competitor entries are large rounded cards
- active card gets emerald-tinted gradient and stronger glow
- inactive cards are muted translucent dark cards

Detail area:

- selected competitor hero card
- weekly summary card
- topic clusters card
- “Мы vs Они” comparison card with horizontal coverage bars
- detailed change cards with diff blocks

### Module “Мы”

From [components/ProjectSitePanel.tsx](./components/ProjectSitePanel.tsx):

Top block:

- section badge `Модуль "Мы"`
- heading `Собственный сайт проекта`
- KPI cards if the site already exists
- setup/edit panel inside a dark translucent inner card

Supporting areas:

- site summary card
- topic coverage card with progress bars
- list of current pages
- “Как это используется” explanatory cards

## Comparison bars

Used in Competitor Watcher comparison blocks.

Pattern:

- small uppercase label row
- right-aligned numeric value
- low-opacity track
- bright gradient fill

Color mapping:

- competitor coverage: amber
- our coverage: emerald or sky depending on relative position

## Meta cells and KPI cards

Meta cells:

- small rounded dark tiles
- uppercase muted label
- white or slate-100 value

KPI cards:

- rounded `[22px]`
- translucent or lightly elevated surface
- small uppercase label row with icon
- large bold numeric value

## Motion and interaction

The UI has motion, but motion is restrained.

Rules:

- hover lift is usually `translateY(-2px)` to `translateY(-0.5)`
- active press is a slight scale down
- focus states use emerald ring
- glows are soft and blurry, not neon-hard
- mobile disables some more playful animations to avoid jitter

Existing helpers:

- `.focus-ring-brand`
- `.animate-fade-in-scale`
- `.btn-ripple`
- `.btn-magnetic`
- `.icon-bounce`

Do not add aggressive bouncy motion or overshoot springs.

## Readability rules

Very important for this codebase:

- do not use dark text on dark translucent surfaces
- do not place nearly-black text on emerald/teal glass without a solid backing
- on dark cards:
  - title: white
  - body: slate-300
  - labels: slate-400
- on light cards:
  - title: slate-900
  - body: slate-600 or slate-500

If a field/control feels like it visually floats awkwardly above the card, wrap it in a dedicated field shell.

## Responsive behavior

The app is mobile-first.

Key rules:

- minimum touch target is `44px`
- grid layouts collapse vertically on mobile
- icon tap areas are enlarged on mobile
- sticky header remains compact
- side drawer navigation still works on mobile and should feel full-screen enough

Do not create tiny controls or tightly packed desktop-only layouts.

## Implementation rules for another agent

If recreating the UI:

1. Keep the dark mesh app background.
2. Use `app-dark-card` for most main workspace sections.
3. Use large radii everywhere.
4. Keep emerald/cyan as the primary accent family.
5. Use white/slate text on dark surfaces.
6. Use light premium cards only where the current app already uses them.
7. For Monitoring family forms, use wrapped field-shell inputs, not plain inputs.
8. Keep the burger drawer navigation exactly as a premium slide-over, not a simple dropdown.
9. Preserve badge-heavy information architecture.
10. Preserve the current hierarchy: header, project header, content cards, expandable sections.

## Things that would be wrong

Do not do the following:

- flat black backgrounds with no depth
- generic Tailwind gray cards everywhere
- square corners
- default browser select styling
- purple-first redesign
- minimal monochrome redesign
- thin hairline-only cards with no shadows
- black text on semi-dark cards
- replacing dark glass cards with flat white cards
- turning the burger drawer into top tabs again

## Quick recreation checklist

For a close 1:1 recreation, verify all of these:

- app root uses dark animated mesh background
- sticky dark glass header exists
- project header is a light premium card with burger drawer
- major content cards use `app-dark-card`
- primary buttons use emerald -> teal -> sky gradient
- badges are tiny uppercase rounded pills
- monitoring family uses matching inner form shells
- competitor comparison includes visual bars
- project cards hover upward and reveal subtle affordances
- empty states are centered dark cards with large icon tiles

## Recommended workflow for another AI agent

When recreating the UI:

1. Rebuild global tokens and surface helpers from [index.css](./index.css).
2. Rebuild the dark app shell and sticky header.
3. Rebuild the light project header and drawer navigation.
4. Rebuild `ProjectList`.
5. Rebuild the Monitoring family as one coherent subsystem:
   - SEO Monitoring
   - Competitors
   - Мы
6. Match spacing, corner radius, text color hierarchy, and shadows before refining content details.

If the recreated UI feels cleaner but less premium, it is wrong.
If it feels generic SaaS, it is wrong.
If it feels like the current app but more structurally consistent, it is correct.
