# Deadlnr Redesign — OpenDesign Project Brief

## Product
Deadlnr — a Tinder-style swipe app for Canvas LMS assignments.
Students swipe through upcoming deadlines: left = skip/dismiss, right =
open a detail modal (mark done with confetti, or copy assignment context
to clipboard and launch their preferred AI assistant).

## Audience
High school / university students. Mobile-first usage pattern
(swipe gesture), but must be excellent on desktop too.

## Current state
Working Next.js 16 app, dark theme (#0B0D12 bg, #FF4D1C flame-orange
accent, Jakarta Sans + Space Grotesk). Screens:
1. **Deck (/)** — "What's due?" header, card stack (3 visible, stacked),
   skip/reload/done action buttons, keyboard hints
2. **History (/history)** — stats cards (Completed/Skipped/Done-Rate),
   7-day activity bar chart, swipe log list with restore buttons
3. **Tasks (/tasks)** — searchable/filterable task list, Upcoming vs
   Past-Due sections, file attachments per task
4. **Settings (/settings)** — theme picker, AI assistant picker,
   Canvas iCal feed URL + API token config
5. **Login** — email OTP flow

## Goal
Produce 2–3 redesigned prototype variants of the **Deck screen** (the
hero screen) exploring different design systems, so the owner can pick
a direction before we port it into production code. If time permits,
one variant of the History stats view too.

## Constraints
- Must remain dark-mode-first
- Must keep: swipe interaction affordance, course-color coding,
  urgency indication for <24h deadlines, AI-launch action
- Real data shape: title, course tag, due date/time, description,
  attachments count, canvasUrl link
- No gradients-as-decoration; restraint over flash

## Variants requested
1. **Linear system** (`design-systems/linear-app`) — near-black canvas,
   indigo-violet accent, Inter 510 weight, translucent cards
2. **Raycast system** (`design-systems/raycast`) — command-palette
   aesthetic, compact density
3. Optional wildcard: any system you think fits a student deadline tool
