# DESIGN.md

## Purpose

This document describes the current shipped frontend design of the application.

Its job is not to suggest improvements. Its job is to let another AI agent recreate the UI as closely as possible from the current implementation.

If there is any conflict between this document and the code, the code is the source of truth.

## Best 6 Source Files

If another AI agent can only ingest 6 files, use these:

1. [DESIGN.md](./DESIGN.md)
2. [index.css](./index.css)
3. [App.tsx](./App.tsx)
4. [components/Header.tsx](./components/Header.tsx)
5. [components/ProjectHeader.tsx](./components/ProjectHeader.tsx)
6. [components/ProjectList.tsx](./components/ProjectList.tsx)

These 6 files define the shell, the global look, the main navigation pattern, and the visual structure of the workspace.

## Wider UI Source of Truth

For a more complete reconstruction, also inspect:

- [components/MonitoringPanel.tsx](./components/MonitoringPanel.tsx)
- [components/CompetitorWatcherPanel.tsx](./components/CompetitorWatcherPanel.tsx)
- [components/ProjectSitePanel.tsx](./components/ProjectSitePanel.tsx)
- [components/SettingsForm.tsx](./components/SettingsForm.tsx)
- [components/ResultView.tsx](./components/ResultView.tsx)
- [components/AuthScreen.tsx](./components/AuthScreen.tsx)
- [components/EmptyState.tsx](./components/EmptyState.tsx)
- [components/Toast.tsx](./components/Toast.tsx)

## High-Level Design Intent

The app is a premium dark AI workspace with emerald and cyan accents.

It should feel:

- dark, deep, and layered
- premium but not flashy
- calm and focused
- dense enough for “power-user” work
- readable inside Telegram WebApp framing
- modern and slightly futuristic

This is not a playful consumer UI.
This is not a minimal white SaaS dashboard.
This is not a purple-first design system.

## Global Aesthetic

### Overall feel

The current UI is built around:

- a dark animated mesh background
- translucent dark cards with blur
- large radii
- soft glows instead of sharp contrast
- bright emerald primary actions
- white and slate text on dark surfaces

### What the app should never become

Do not turn this UI into:

- flat black with no depth
- generic Tailwind gray-on-gray SaaS
- a white dashboard with green accents
- a highly colorful gradient-heavy Dribbble mock
- a purple-dominant cyber UI

## Global Layout

From [App.tsx](./App.tsx):

- the app uses `min-h-screen`
- root background uses `bg-mesh-animated`
- text defaults to `text-slate-100`
- the main container uses responsive horizontal padding and a wide `xl:max-w-[1600px]`

The app has 3 main shell layers:

1. global top header
2. project/workspace shell
3. content cards

## Background System

From [index.css](./index.css):

- `.bg-mesh-animated` is the app background
- it uses a dark multi-stop gradient with subtle animated color fields
- depth comes from radial overlays and slow motion, not visible texture

The background should always suggest atmosphere.
It should never look like a flat solid fill.

## Core Color Direction

### Primary accents

- emerald / green is the main action color
- cyan / sky is the secondary accent

### Main dark tones

- deep navy / slate / near-black backgrounds
- white primary text
- slate-300 / slate-400 supporting text

### Secondary tones

- amber for warnings
- red for destructive or critical states
- sky/cyan for informational states

Purple/pink exists only as an occasional highlight, not as the brand center.

## Typography

Typography is clean, product-oriented, and sans-serif.

It should feel:

- compact
- bold in headings
- calm in body text
- never decorative or editorial

### Typical hierarchy

- page/hero titles: `text-2xl`, `text-3xl`, occasionally larger on wide screens
- section headings: `text-lg`, `text-xl`
- body text: `text-sm` to `text-base`
- helper text: `text-xs`, `text-sm`
- labels: uppercase `text-[11px]` with wide tracking

### Tone rules

- dark surfaces: white title, slate-300 body, slate-400 labels
- light surfaces: slate-900 title, slate-600 body

Never use dark gray text on dark translucent surfaces.

## Shape Language

Large radii are mandatory.

Typical shape system:

- pills and badges: `rounded-full`
- controls: `rounded-2xl`
- inner cards: around `rounded-[20px]` to `rounded-[24px]`
- major cards: around `rounded-[24px]` to `rounded-[32px]`

Anything sharp, square, or boxy is visually wrong.

## Surface System

### 1. Main dark workspace card

Primary reusable class:

- `.app-dark-card`

Use for:

- monitoring panels
- competitor panels
- project site panels
- result containers
- dark modals
- empty states

Visual behavior:

- translucent dark fill
- blur
- white/10 border
- soft shadow
- premium, not heavy

### 2. Light shell card

Primary reusable class:

- `.app-shell-card`

Use for:

- selective light contrast surfaces
- premium shells already present in the app

Important:

- do not overuse light cards
- the current design is mostly dark-first

### 3. Light card

Primary reusable class:

- `.app-light-card`

Use sparingly for:

- specific lighter content blocks
- some alerts and structured content areas

## Buttons

Buttons are large, tactile, and rounded.

### Primary buttons

Main class:

- `.app-btn-primary`

Visual pattern:

- emerald -> teal -> cyan gradient
- strong contrast
- rounded shape
- elevated shadow
- slight lift or press feedback

Use for:

- create
- save
- scan
- generate
- add URL / add competitor / add site

### Secondary dark buttons

Main class:

- `.app-btn-dark`

Visual pattern:

- dark translucent fill
- white/10 border
- white text
- subtle hover brightening

Use for:

- secondary actions
- pause / enable
- import / supporting actions

### Danger buttons

Danger buttons are custom utility recipes, not a generic helper.

Pattern:

- low-opacity red background
- red border
- red text

Use for:

- delete
- destructive confirmations

## Inputs and Form Fields

The current design uses 2 input families.

### Legacy dark input

Class:

- `.app-input-dark`

This still exists in older or broader generator flows.

### Preferred field-shell system

This is the preferred style for the Monitoring family and newer modules.

Pattern:

- outer shell:
  - rounded around 20px
  - border `white/12`
  - dark vertical gradient
  - inner highlight
  - soft depth shadow
- inner control:
  - transparent background
  - no own border
  - white text
  - slate placeholder

Labels:

- uppercase
- `text-[11px]`
- large tracking
- slate-400

This field-shell style is used in:

- [components/MonitoringPanel.tsx](./components/MonitoringPanel.tsx)
- [components/CompetitorWatcherPanel.tsx](./components/CompetitorWatcherPanel.tsx)
- [components/ProjectSitePanel.tsx](./components/ProjectSitePanel.tsx)

## Pills, Badges, and Status Chips

These are essential to the information architecture.

### Generic section badge

Pattern:

- tiny uppercase text
- rounded-full
- tracked letter spacing
- low-opacity emerald or white tint

Used for:

- section identity
- mode identity
- small context labels

### Status chips

Pattern:

- rounded-full
- border + tinted fill
- text-xs

Severity mapping:

- critical = red
- warning = amber
- info = sky

State mapping:

- active = emerald
- paused/inactive = muted white/gray

## Global Header

From [components/Header.tsx](./components/Header.tsx):

The global header is:

- sticky
- dark glass
- blurred
- shallow but premium
- compact on mobile

Key pieces:

- logo block with emerald/cyan gradient tile
- app title in white
- small `App` badge on wider screens
- admin/subscription controls on the right
- user identity pill on large screens

This header should always feel like a stable top shell, not a hero section.

## Project Workspace Shell

From [components/ProjectHeader.tsx](./components/ProjectHeader.tsx):

This is the most important shell pattern in the app right now.

### Current structure

The workspace shell consists of:

- a persistent left sidebar on wide screens
- a mobile slide-over navigation on smaller screens
- a dark top project bar
- a dark hero card with project context and current mode

### Desktop sidebar

Behavior:

- visible from `xl` and up
- fixed on the left
- dark translucent background
- blurred
- scrollable vertically

Content:

- brand/workspace label
- primary navigation items
- `Monitoring` parent item with expanding children
- bottom CTA back to all projects
- current project identity tile

Important:

- this is not a decorative sidebar
- all visible buttons should map to real navigation

### Mobile navigation

Behavior:

- opened by burger button
- slides in from the left
- dark overlay behind it
- scrollable
- visually consistent with the desktop sidebar

### Project top bar

This top bar is dark, not light.

It includes:

- breadcrumbs
- current section title
- section description
- contextual quick actions
- current project pill

It should not contain fake search controls or fake utility buttons.

### Project hero card

The hero card below the top bar is:

- dark
- rounded
- softly glowing
- strongly contextual

It contains:

- active section badge
- project name
- current section description
- small summary cards

## Project List Screen

From [components/ProjectList.tsx](./components/ProjectList.tsx):

This is the dashboard-style screen shown before entering a project.

### Layout

- left functional filter sidebar on wide screens
- top search and quick controls
- large dark hero card
- project card grid below

### Left sidebar

The current sidebar must be functional, not decorative.

It contains:

- real filters
- count indicators
- create project CTA
- active filter status

### Search area

The search field is real and should filter the visible project list.

### Hero block

The project dashboard hero uses:

- dark premium card
- section badge
- large title
- supporting description
- create project CTA

### Project cards

Project cards are:

- dark
- rounded
- slightly elevated
- hover-lifted

Key details:

- icon tile at top-left
- subtle status pill
- quiet delete action
- date in muted tone
- “Open” affordance on the bottom-right

## Monitoring Family

The following 3 modules must feel like one coherent subsystem:

- SEO Monitoring
- Competitor Watcher
- Project Site / “Мы”

### Shared design rules

- main outer section uses `app-dark-card`
- decorative blurred accent circles in the hero section
- small section badge
- strong white heading with icon
- KPI cards aligned on the right on wide layouts
- inner form panel with darker inset shell
- field-shell inputs instead of raw browser-style controls
- list/detail cards with dark layered backgrounds

## SEO Monitoring

From [components/MonitoringPanel.tsx](./components/MonitoringPanel.tsx):

Important pieces:

- section badge `Monitoring`
- heading `SEO Monitoring + Alerts`
- KPI cards
- add-URL form
- monitored page cards
- expandable event history and diff sections

Page cards include:

- severity chip
- activity chip
- frequency chip
- title or label
- URL
- meta info tiles
- right-side action buttons
- expandable diff/history footer

## Competitor Watcher

From [components/CompetitorWatcherPanel.tsx](./components/CompetitorWatcherPanel.tsx):

Important pieces:

- section badge `Competitor Watcher`
- heading `Growth Intelligence по конкурентам`
- KPI cards
- add-competitor form
- competitor list
- selected competitor detail area

Detail area includes:

- selected competitor hero
- weekly summary
- topic clusters
- `Мы vs Они` comparison
- change history cards

### Comparison bars

The comparison bars are important:

- uppercase label row
- numeric value aligned right
- muted track
- gradient fill

Color mapping:

- competitor = amber
- our side = emerald or sky

## Project Site / “Мы”

From [components/ProjectSitePanel.tsx](./components/ProjectSitePanel.tsx):

Important pieces:

- section badge `Модуль "Мы"`
- heading `Собственный сайт проекта`
- KPI cards when site exists
- create/edit form
- action buttons
- site summary card
- topic coverage block
- current pages list
- “Как это используется” cards

This module belongs visually to the Monitoring family and should not look like a separate product.

## Empty States

From [components/EmptyState.tsx](./components/EmptyState.tsx):

Pattern:

- centered
- large icon tile
- white title
- slate support text
- always inside a premium card, usually dark

They should feel polished, not like plain placeholder text.

## Motion and Interaction

Motion should be subtle and premium.

Use:

- small hover lift
- small press feedback
- soft fade/slide entrances
- blur-backed overlays
- quiet glow changes

Avoid:

- aggressive spring motion
- bouncing panels
- flashy neon pulsing
- large parallax effects

## Responsive Rules

The design is mobile-first, but current optimization priority is:

- mobile
- tablet
- desktop
- wide desktop

### Rules that define the current responsive behavior

1. The main workspace sidebar appears only on `xl`.
2. On smaller widths, navigation becomes a slide-over.
3. Summary blocks should not depend on hard `min-width` before `xl`.
4. Major forms should collapse early:
   - single column on narrow widths
   - 2 columns on medium widths where needed
   - 12-column desktop layout only on wide enough screens
5. Large headings must scale down on smaller widths.
6. Long project names, URLs, and values must wrap instead of forcing overflow.
7. Cards should stack earlier rather than compress awkwardly.

### Practical responsive goals

- text should not drift outside cards
- action groups should wrap naturally
- KPI cards should reflow rather than overflow
- hero blocks should remain readable at narrow window heights and widths
- side navigation should scroll if content exceeds viewport height

## Readability Rules

These rules are critical in this codebase:

- never use near-black text on dark translucent surfaces
- never place raw browser-styled inputs on premium cards
- do not let long values overflow silently if they can wrap
- white is for headings and key values
- slate-300 is for body copy
- slate-400 is for labels and helper text

If a form or control feels visually detached, wrap it in a field shell.

## What Another Agent Must Preserve

If another AI agent recreates the UI, it must preserve:

- dark animated mesh app background
- sticky dark glass global header
- dark workspace shell with responsive sidebar/drawer navigation
- large-radius premium cards
- emerald/cyan action language
- badge-heavy information architecture
- Monitoring-family consistency
- soft, blurred, premium layering
- practical responsive behavior instead of fixed-width layouts

## What Would Be Wrong

The following would be inaccurate reconstructions:

- reintroducing top tabs instead of the current workspace shell
- turning the project header into a white card
- using flat gray blocks with no depth
- making the monitoring modules visually different from each other
- relying on browser-default selects and inputs
- using decorative sidebar buttons that do nothing
- using dark text on dark surfaces
- forcing fixed widths that break tablet layouts

## Recreation Checklist

For a close reconstruction, verify:

- app root uses dark mesh background
- global header is sticky and glassy
- workspace shell uses left sidebar on wide screens and drawer on smaller screens
- project list has functional filtering and search
- major cards use dark premium surfaces
- primary CTA buttons are emerald/cyan gradients
- Monitoring, Competitors, and “Мы” share one visual language
- field-shell inputs are used in the newer modules
- text wraps safely in cards and meta areas
- layouts reflow rather than overflow on medium window sizes

If the result looks cleaner but less premium, it is wrong.
If it looks generic SaaS, it is wrong.
If it looks like the shipped UI but slightly more structurally consistent, it is correct.
