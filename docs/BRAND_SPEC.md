# Nairobi Sculpt — Brand Specification

## 1. Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| **Primary Dark** | `#2c2e4b` | Main text, primary buttons, dark surfaces, sidebar background |
| **Beige Light** | `#e7d6bf` | Card backgrounds, borders, dividers, subtle surfaces |
| **Gold Accent** | `#caa26a` | Icons, focus rings, CTAs, active states, highlights |
| **Success** | `#10b981` | Success badges, completed states |
| **Warning** | `#f59e0b` | Warning badges, pending states |
| **Error** | `#ef4444` | Error messages, destructive actions |
| **White** | `#FFFFFF` | Card backgrounds, header backgrounds, input backgrounds |

## 2. Typography

- **Font family**: System UI stack; headings may use `var(--font-playfair), Georgia, serif` for brand moments.
- **Base size**: `16px` for body text.
- **Headings**: `text-2xl` / `font-bold` for page titles; `text-base` / `font-semibold` for section headers.
- **Body**: `text-sm` / `text-slate-500` for subtitles and secondary text on light backgrounds.
- **On dark backgrounds**: Use `text-white` for primary text, `text-white/70` for secondary, `text-white/50` for disabled/muted.

## 3. Backgrounds & Surfaces

### Doctor Area (`/doctor/**`)
- **Background image**: `public/bg.webp`
- **Overlay**: Dark gradient using Primary Dark (`#2c2e4b`) at 50–80% opacity
- **Surfaces**: White cards with `border-[#e7d6bf]` and subtle shadows
- **Header**: White strip with `border-b border-[#e7d6bf]`

### Frontdesk Area (`/frontdesk/**`)
- **Background image**: `public/bg2.webp`
- **Overlay**: Lighter treatment appropriate for reception/front-of-house — use Beige Light (`#e7d6bf`) at 75–85% opacity, or a very light gradient
- **Surfaces**: White cards with `border-[#e7d6bf]`
- **Header**: White strip with `border-b border-[#e7d6bf]`

### Login Page (`/(auth)/**`)
- **Background image**: `public/bg.webp`
- **Overlay**: Dark gradient matching doctor area
- **Card**: `bg-[#e7d6bf]` on desktop, transparent on mobile with glassmorphism inputs

## 4. Component Patterns

### Cards
```tsx
<div className="border border-[#e7d6bf] bg-white rounded-xl shadow-sm">
  <div className="px-5 py-4 border-b border-[#e7d6bf]">
    <h3 className="text-base font-semibold text-[#2c2e4b]">Title</h3>
  </div>
  <div className="p-5">...</div>
</div>
```

### Buttons
- **Primary**: `bg-[#2c2e4b] text-white hover:bg-[#1a1c2f]`
- **Gold/Accent**: `bg-[#caa26a] text-[#2c2e4b] hover:bg-[#b8913e]`
- **Outline**: `border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30`

### Inputs
- **Light mode**: `border-slate-300 bg-white focus:border-slate-300 focus:ring-[#caa26a]/30`
- **Dark/glass mode**: `bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/50`

### Badges
- Use brand palette: gold for pending/warning, emerald for success, rose for errors, beige/slate for neutral.

### Tables
- Header: `bg-[#e7d6bf]/30`
- Row hover: `hover:bg-[#e7d6bf]/30`
- Text: `text-[#2c2e4b]` primary, `text-[#2c2e4b]/60` secondary

## 5. Layout Patterns

### Dashboard Shell
- Max width container with consistent padding: `max-w-[1600px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-7`
- Page title: `text-2xl font-bold tracking-tight text-white` on dark bg, `text-[#2c2e4b]` on light
- Subtitle: `text-sm text-white/70` on dark bg, `text-[#2c2e4b]/60` on light

### Sidebar + Header
- Sidebar: Dark (`#2c2e4b`) with light nav items
- Header: White strip connecting sidebar to content, `border-b border-[#e7d6bf]`, top accent `border-t-2 border-[#caa26a]`

## 6. Accessibility & Performance

- All interactive elements must have `focus-visible:ring-4` with appropriate brand color
- Use `aria-label`, `role`, and semantic HTML
- Prefer CSS transitions (`transition-all duration-200`) over JS animations
- Use `animate-in fade-in` for page entry
- Skeleton loaders use brand beige tones (`bg-[#e7d6bf]/60`)

## 7. Print Styles

- Consultation record print view uses white backgrounds and black text
- Brand colors removed in print via `print:bg-white print:text-black print:border-black`
- Keep document structure clean with borders and sections
