# Japeans — Design System (Master)

Source: ui-ux-pro-max dataset (products #78 "Language Learning App", colors #78, typography #21 + #22),
looked up directly from the CSVs (Python CLI not available on this machine). Page-specific overrides go in `pages/<page>.md`.

## Direction
- **Product type:** language-learning tool for Vietnamese adults (dictionary first, study later).
- **Style:** Flat design + micro-interactions, content-first. Dataset primary for this category is
  Claymorphism + Vibrant/Block-based; we reserve the soft "clay" treatment (rounded-2xl, soft shadow,
  vivid fills) for gamified study screens (Module D/H) and keep dictionary pages calm and dense.
- **Avoid (dataset anti-patterns):** boring design with no motivation, emoji as icons, gray-on-gray text,
  color-only meaning.

## Color tokens (CSS variables in `src/app/globals.css`, used via Tailwind `bg-primary`, `text-muted-foreground`…)
| Token | Light | Dark |
|---|---|---|
| primary / on-primary | #4F46E5 / #FFFFFF | #818CF8 / #0F172A |
| secondary | #818CF8 | #6366F1 |
| accent (progress, "common") / on-accent | #16A34A / #FFFFFF | #4ADE80 / #052E16 |
| background | #EEF2FF | #0E0F1C |
| foreground | #312E81 | #E0E7FF |
| card / card-foreground | #FFFFFF / #1E1B4B | #171830 / #E0E7FF |
| muted / muted-foreground | #EBEEF8 / #475569 | #22243F / #B4BCE0 |
| border | #C7D2FE | #2E3156 |
| destructive / on-destructive | #DC2626 / #FFFFFF | #F87171 / #450A0A |
| ring | #4F46E5 | #818CF8 |

Accent green on white must be used with white text only on solid fills ≥ 14px bold; for text on light
backgrounds use `text-accent-strong` (#15803D) to keep 4.5:1.

## Typography
- UI + Vietnamese: **Be Vietnam Pro** (300–700), `font-sans`.
- Japanese text: **Noto Sans JP**, `font-jp` (applied with `lang="ja"`).
- Display kanji (detail hero, stroke diagrams): **Noto Serif JP**, `font-jp-serif`.
- Scale: 12 / 14 / 16 (body) / 18 / 24 / 32 / 48; display kanji 96–160. Line-height 1.6 body, 1.2 headings.
- Weights: headings 600–700, body 400, labels 500.

## Layout
- Mobile-first; container `max-w-5xl`, gutter 16px (mobile) / 24px (≥768).
- Spacing on 4/8 scale; section gap 32–48.
- Header: logo + primary nav (Tra từ, Kanji, Học phần) + account slot. Sticky, z-20. Below `sm` the logo shows only its icon and nav items stack icon over an 11px label (no wrapping).
- Detail pages: hero (headword/kanji) → facts → senses/components → examples → related.

## Components
- Search input: visible label (sr-only ok when the page heading names it), 48px tall, rounded-xl,
  submit button with icon + text; helper text listing accepted inputs (kanji, kana, romaji, Hán Việt, English).
- Result row: headword (font-jp, 24px) + reading + Hán Việt (small caps style) + "Thông dụng" badge
  (accent, with text — never color only) + up to 3 meanings. Whole row is one link, hover = bg-muted.
- Tag chips: rounded-full, 12–13px, muted background; POS labels in Vietnamese.
- Empty state: message + suggestions (example queries).

## Forms
- Shared classes in `globals.css`: `.field-input`, `.btn-primary`, `.btn-secondary`, `.icon-btn` (44px targets, keep the global focus ring).
- Visible labels, `*` + sr-only "(bắt buộc)" for required fields, error text under the field via `aria-describedby`, error summary (`role=alert`, focused) after a failed submit.
- Destructive actions: two-step inline confirmation; solid button uses `bg-destructive text-on-destructive`.

## Icons
Phosphor (`@phosphor-icons/react`; use `/dist/ssr` in Server Components), weight "regular", 20px in UI, 16px inline.
Decorative icons next to text: `aria-hidden`.

## Motion
150–200ms ease-out for hover/press; stroke-order animation ≈ 450ms per stroke; everything disabled under
`prefers-reduced-motion`.

## Accessibility checklist
Contrast ≥ 4.5:1, visible focus ring (2px ring color + offset), `lang="ja"` on Japanese text, heading order,
skip link, targets ≥ 44px on mobile.
