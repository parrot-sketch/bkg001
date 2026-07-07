# Nairobi Sculpt — Brand Color Palette

## Primary Colors

### Deep Navy `#2c2e4b`
**Usage:** Primary background, sidebar, dark surfaces, primary text on light backgrounds
- Main application background (sidebar, dark sections)
- Page titles and headings
- Body text on light backgrounds
- Borders and dividers
- **Contrast:** High contrast against white/light backgrounds

### Brand Gold `#caa26a`
**Usage:** Primary accent, buttons, active states, focus rings, brand highlights
- Call-to-action buttons
- Active navigation indicators
- Focus rings and outlines
- Success states
- Icons and decorative elements
- **Hover state:** `#bd9257` (darker gold)
- **Contrast:** Good against `#2c2e4b` and white

### Soft Beige `#e7d6bf`
**Usage:** Secondary background, borders, subtle fills, hover states
- Card and panel borders
- Table row hover backgrounds
- Subtle section dividers
- Secondary button backgrounds
- Icon backgrounds
- **Contrast:** Light tint for backgrounds and borders

## Secondary Colors

### Teal `#0c5d69`
**Usage:** Information banners, doctor badges, secondary accents
- Information alert boxes
- Doctor role badges
- Secondary action buttons
- Success/confirmation states
- **Contrast:** Good against white and light backgrounds

## Neutral / Support Colors

### Off-White `#fbfaf8`
**Usage:** Input backgrounds, light surfaces
- Form input backgrounds
- Card backgrounds on light sections
- **Contrast:** Very subtle, near-white

### Light Gray `#f0f4f5`
**Usage:** Loading states, neutral backgrounds
- Loading skeleton backgrounds
- Fallback backgrounds
- **Contrast:** Low contrast, neutral

### Muted Gray `#8b8994`
**Usage:** Placeholder text, secondary text on light backgrounds
- Input placeholder text
- Secondary descriptive text
- Helper text
- **Contrast:** Medium, suitable for secondary information

### Dark Gold Text `#8a6a2f`
**Usage:** Warning text on light backgrounds
- Warning message text
- Session expired notices
- **Contrast:** Good against light yellow/beige backgrounds

## Semantic Usage

### Backgrounds
- **Dark:** `#2c2e4b` (primary dark)
- **Light:** `#fbfaf8` or `#ffffff` (cards, forms)
- **Subtle:** `#e7d6bf/10` (10% opacity for hover states)

### Text
- **Primary on dark:** `#ffffff` or `#e7d6bf`
- **Primary on light:** `#2c2e4b`
- **Secondary:** `#8b8994`
- **Disabled:** 50% opacity of parent

### Borders
- **Default:** `#e7d6bf`
- **Subtle:** `#e7d6bf/60` (60% opacity)
- **Focus:** `#caa26a` with `ring-[#caa26a]/40`

### Interactive States
- **Hover (dark bg):** `bg-[#caa26a]/10` (10% gold tint)
- **Hover (light bg):** `bg-[#e7d6bf]/30` (30% beige tint)
- **Active:** `bg-[#caa26a]/12` with `text-white`
- **Focus ring:** `ring-2 focus-visible:ring-[#caa26a]/40`

### Badges & Tags
- **Active:** `bg-[#caa26a]/15 text-[#caa26a] ring-1 ring-[#caa26a]/20`
- **Inactive:** `bg-white/10 text-white/80`
- **Doctor:** `bg-[#0c5d69]/20 text-[#0c5d69] ring-1 ring-[#0c5d69]/30`
- **Nurse:** `bg-[#e7d6bf]/20 text-[#e7d6bf] ring-1 ring-[#e7d6bf]/20`

## Typography Colors
- **Headings:** `#2c2e4b` (light) / `#ffffff` (dark)
- **Body:** `#2c2e4b/90` (light) / `#e7d6bf/80` (dark)
- **Secondary text:** `#8b8994` (light) / `#e7d6bf/50` (dark)
- **Captions:** `#8b8994` (light) / `#e7d6bf/40` (dark)

## Component Examples

### Buttons
```tsx
// Primary
className="bg-[#caa26a] text-[#2c2e4b] hover:bg-[#bd9257]"

// Secondary / Outline
className="border border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"

// Ghost
className="text-white/80 hover:bg-[#caa26a]/10 hover:text-white"
```

### Cards
```tsx
className="border border-[#e7d6bf] bg-white"
```

### Inputs
```tsx
className="border-[#e7d6bf] bg-white focus-visible:border-[#caa26a] focus-visible:ring-[#caa26a]/40"
```

### Alerts
```tsx
// Info
className="border-[#0c5d69]/20 bg-[#0c5d69]/5 text-[#0c5d69]"

// Warning
className="border-[#caa26a]/30 bg-[#f7f0e6] text-[#8a6a2f]"

// Error
className="border-red-400/40 bg-red-500/10 text-red-200"
```

## Accessibility
- All color combinations meet WCAG AA contrast ratios
- Interactive elements have minimum 3:1 contrast ratio
- Focus indicators use `#caa26a` at 40% opacity for visibility
- Text on dark backgrounds: minimum `white/80` (4.5:1 against `#2c2e4b`)

## File Locations
- Login page: `app/(auth)/login/page.tsx`
- Sidebar: `components/shared/UnifiedSidebar.tsx`
- Frontdesk layout: `app/frontdesk/layout.tsx`
- Doctor layout: `app/doctor/layout.tsx`
- Dashboard components: `components/frontdesk/`, `components/doctor/`

## Notes
- All colors are referenced as CSS hex values or Tailwind arbitrary values
- Opacity modifiers (`/10`, `/20`, etc.) use Tailwind's native opacity syntax
- Avoid mixing light-mode `slate-*` tokens with brand colors within the same component
- Maintain consistency by using these tokens across all new components