# NAIROBI SCULPT — FRONTEND DESIGN PRINCIPLES
### Mandatory Reference for All UI Implementation Tasks

> **How to use this document:** Read it in full before writing any UI code. Every section is a constraint, not a suggestion. When in doubt, refer back here rather than defaulting to generic patterns.

---

## 0. SYSTEM IDENTITY

Nairobi Sculpt is a **premium aesthetic surgery clinic management system**. The UI serves surgeons, clinic administrators, and clinical staff — professionals making high-stakes decisions in fast-moving environments.

The design language must communicate:
- **Clinical precision** — nothing is decorative without purpose
- **Premium restraint** — this is a luxury medical practice, not a SaaS startup
- **Operational clarity** — every screen has a job; the UI gets out of the way and lets the work happen

The aesthetic sits at the intersection of **high-end medical software** and **premium hospitality**. Think Vercel's dashboard discipline meets a Swiss clinic's interior. Never bubbly, never corporate-generic, never over-animated.

---

## 1. STACK CONSTRAINTS — NON-NEGOTIABLE

Every UI implementation must adhere to these without exception:

```
Framework:       Next.js (App Router) with TypeScript — strict mode
Styling:         Tailwind CSS utility classes only — no inline styles, no CSS modules
Icons:           lucide-react exclusively — no other icon libraries
Forms:           react-hook-form + zodResolver — no uncontrolled inputs
State:           useState / useReducer for local; server actions for mutations
Data fetching:   Server Components by default; 'use client' only when interaction requires it
Types:           No `any`. No type assertions (`as X`) without a comment justifying it
```

### Component Library Discovery Gate — MANDATORY

**Before writing a single component**, search the codebase to identify the component library in use:

1. Check `package.json` for: `@radix-ui/*`, `shadcn`, `@headlessui/*`, `@mui/*`, `antd`, `@chakra-ui/*`, `mantine`
2. Check `/components/ui/` — if this directory exists and contains primitives like `button.tsx`, `input.tsx`, `card.tsx`, this is a shadcn/ui setup
3. Check `/components/` root for any barrel exports or design system index files

**Apply the correct rule based on what you find:**

| Found | Rule |
|---|---|
| `components/ui/` with shadcn primitives | Use shadcn `Form`, `Card`, `Button`, `Input`, `Select`, `RadioGroup`, `Checkbox`, `Dialog` etc. — never rebuild these |
| Radix UI primitives directly (no shadcn wrapper) | Use Radix primitives directly with Tailwind styling |
| MUI / Ant Design / Chakra | Use that library's components — do not mix with Tailwind utility classes on the same element |
| No component library — raw HTML + Tailwind | Build accessible components using Radix UI headless primitives + Tailwind |

**Never assume shadcn exists without verifying.** Never mix two component libraries on the same surface. Never build a custom `<Modal>` or `<Select>` from scratch when a library primitive is available.

---

## 2. TYPOGRAPHY

Typography is the primary design tool in a clinical system. Use it with intent.

### Scale
Follow a strict type scale. Do not invent ad-hoc sizes.

| Role | Tailwind class | Usage |
|---|---|---|
| Page title | `text-2xl font-semibold tracking-tight` | One per page, top of hierarchy |
| Section heading | `text-lg font-medium` | Card headers, form section labels |
| Body / default | `text-sm` | All general content, form labels |
| Supporting / meta | `text-xs text-muted-foreground` | Timestamps, file numbers, secondary info |
| Monospace data | `font-mono text-sm` | Patient IDs, file numbers, codes, amounts |

### Rules
- **Never use `font-bold` on body text** — use `font-medium` or `font-semibold` only for true headings and key data points
- **Muted foreground is for context, not content** — if the user needs to act on it, it must be in the default foreground colour
- **Patient file numbers, case IDs, and monetary values always render in `font-mono`** — they are data, not prose
- **Line length:** form fields and body text should not exceed `max-w-prose` (65ch) in single-column layouts
- **Don't sentence-case headings inconsistently** — pick one convention per surface and hold it

---

## 3. COLOUR SYSTEM

### Palette Identity — Neutral Slate / Clean Clinical

Nairobi Sculpt uses a **neutral slate foundation** — the visual language of precision and trust. No warm tones, no saturated brand colours competing with clinical content. The palette recedes to let data and actions speak.

### Semantic Colour Tokens
If a CSS variable theme is in use (shadcn or custom), always prefer variables over raw Tailwind colours:

```
background / foreground          — page surfaces and primary text
card / card-foreground           — elevated surfaces (forms, panels)
muted / muted-foreground         — secondary surfaces and supporting text
border                           — all dividers, input borders, separators
primary / primary-foreground     — CTAs, active states, key actions
destructive / destructive-foreground — errors, deletions, irreversible actions
```

When no CSS variable system is confirmed, use the following Tailwind slate scale as the base:

```
Page background:     bg-slate-50 (light) / bg-slate-950 (dark)
Card / panel:        bg-white (light) / bg-slate-900 (dark)
Border:              border-slate-200 (light) / border-slate-800 (dark)
Primary text:        text-slate-900 (light) / text-slate-50 (dark)
Secondary text:      text-slate-500 (light) / text-slate-400 (dark)
Primary action:      bg-slate-900 text-white (light) / bg-slate-50 text-slate-900 (dark)
```

### Accent Colour
The single accent colour permitted in clinical surfaces is **slate-700 to slate-900** for interactive elements — no blues, no purples, no brand gradients on clinical tools. Patient-facing surfaces may use a single restrained accent (see Section 16).

### Status Badge Conventions

| Status | Light mode | Dark mode |
|---|---|---|
| Completed / Ready | `text-emerald-700 bg-emerald-50 border border-emerald-200` | `text-emerald-400 bg-emerald-950 border-emerald-800` |
| Pending / In Progress | `text-amber-700 bg-amber-50 border border-amber-200` | `text-amber-400 bg-amber-950 border-amber-800` |
| Cancelled / Failed | `text-red-700 bg-red-50 border border-red-200` | `text-red-400 bg-red-950 border-red-800` |
| Scheduled / Upcoming | `text-slate-700 bg-slate-100 border border-slate-300` | `text-slate-300 bg-slate-800 border-slate-600` |
| Neutral / Unknown | `text-slate-500 bg-slate-100` | `text-slate-400 bg-slate-800` |

Badges must always have a border — borderless badges disappear on card surfaces.

**Never use colour alone to convey meaning** — always pair with a label, icon, or both.

### Colour Rules
- No hardcoded hex values anywhere in components
- No purple, indigo, or gradient backgrounds on clinical surfaces
- No `bg-gradient-to-*` on form or dashboard pages — flat surfaces only
- Hover states: `hover:bg-slate-100` (light) / `hover:bg-slate-800` (dark) — never a colour shift, only a lightness shift

---

## 4. SPACING & LAYOUT

### Spacing Scale
Use Tailwind's default spacing scale consistently. The most common values in this system:

| Context | Value |
|---|---|
| Between form fields | `space-y-4` or `gap-4` |
| Between form sections | `space-y-8` |
| Card internal padding | `p-6` |
| Page container padding | `px-4 py-6 md:px-8` |
| Between label and input | handled by shadcn FormItem — don't override |
| Inline icon + text gap | `gap-2` |

### Layout Patterns

**Forms:** Single column, max width constrained
```tsx
<div className="max-w-2xl mx-auto space-y-8">
  {/* form sections */}
</div>
```

**Detail pages (case plan, patient profile):** Constrained reading width with optional sidebar
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2 space-y-6">{/* main content */}</div>
  <div className="space-y-4">{/* sidebar / metadata */}</div>
</div>
```

**Dashboards / list pages:** Full width with internal card grid
```tsx
<div className="space-y-6">
  <PageHeader />
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {/* stat cards */}
  </div>
  <DataTable />
</div>
```

**Rule:** Never let content span full viewport width without a `max-w-*` constraint on text-heavy sections.

---

## 5. COMPONENT PATTERNS

> **Before using any pattern below:** confirm the component library from the discovery gate in Section 1. If shadcn is confirmed, use the shadcn variants shown. If a different library is in use, adapt the pattern to that library's equivalent primitives.

### 5.1 Page Header
Every page must open with a consistent header:
```tsx
<div className="flex items-start justify-between mb-6">
  <div>
    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
    {subtitle && (
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    )}
  </div>
  <div className="flex items-center gap-2">
    {/* primary action button(s) */}
  </div>
</div>
```

### 5.2 Cards
Use shadcn `Card` for all elevated surfaces. Do not create `div`s with manual shadow and border classes.
```tsx
<Card>
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
    <CardDescription>Optional supporting text</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* content */}
  </CardContent>
</Card>
```

For cards with a footer action:
```tsx
<CardFooter className="flex justify-end gap-2 border-t pt-4">
  <Button variant="outline">Cancel</Button>
  <Button>Save</Button>
</CardFooter>
```

### 5.3 Forms

**If shadcn is confirmed:** Always use shadcn `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`.
```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    <FormField
      control={form.control}
      name="fieldName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Label Text</FormLabel>
          <FormControl>
            <Input placeholder="..." {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

**If no component library or raw Tailwind:** Use react-hook-form's `register` + manual label/error pattern:
```tsx
<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
  <div className="space-y-1.5">
    <label htmlFor="fieldName" className="text-sm font-medium text-slate-700">
      Label Text
    </label>
    <input
      id="fieldName"
      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
      {...register('fieldName')}
    />
    {errors.fieldName && (
      <p className="text-xs text-red-600">{errors.fieldName.message}</p>
    )}
  </div>
</form>
```

**Never render raw `<label>` + `<input>` pairs without explicit `htmlFor` / `id` association** — always ensure accessibility linkage regardless of library.

### 5.4 Buttons

Button hierarchy — one primary CTA per view:
```
Primary action:     <Button>Save Changes</Button>
Secondary action:   <Button variant="outline">Cancel</Button>
Destructive action: <Button variant="destructive">Delete</Button>
Ghost / subtle:     <Button variant="ghost">View</Button>
Icon-only:          <Button variant="ghost" size="icon"><Icon /></Button>
```

Loading state — always show feedback during async operations:
```tsx
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? 'Saving...' : 'Save Changes'}
</Button>
```

**Never disable a button without a visible reason.** Pair disabled state with a tooltip or inline message explaining why.

### 5.5 Read-Only Data Display
For display-only fields (patient file number, auto-populated values):
```tsx
<div className="space-y-1">
  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
    Patient File Number
  </p>
  <p className="font-mono text-sm font-medium">{fileNumber}</p>
</div>
```

Do not render a disabled `<Input>` for display-only data — it signals editability to the user.

### 5.6 Empty States
Every list, table, or data surface must have an empty state:
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Icon className="h-10 w-10 text-muted-foreground/40 mb-3" />
  <p className="text-sm font-medium text-muted-foreground">{message}</p>
  {action && <div className="mt-4">{action}</div>}
</div>
```

### 5.7 Loading States
- **Full page load:** Use shadcn `Skeleton` components mirroring the actual layout
- **Inline / button:** Spinner via `<Loader2 className="animate-spin" />`
- **Data tables:** Skeleton rows matching the column structure
- **Never use a plain text "Loading..."** without a visual indicator

### 5.8 Error States
Always surface errors where the user's attention is — inline in the form, not only in a toast:
```tsx
// Inline field error — handled by FormMessage
// Server-level error — show above the submit button
{serverError && (
  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-md">
    <AlertCircle className="h-4 w-4 shrink-0" />
    <span>{serverError}</span>
  </div>
)}
```

Toasts are for **non-blocking confirmations** (save successful, item added). Errors that prevent progress must be inline.

---

## 6. DATA TABLES

Use the shadcn `DataTable` pattern with `@tanstack/react-table`.

Standards:
- Column headers: `text-xs font-medium text-muted-foreground uppercase tracking-wide`
- Row actions: right-aligned `DropdownMenu` with a `MoreHorizontal` icon trigger
- Sortable columns: include sort indicator icon
- Pagination: bottom of table, show "X–Y of Z results"
- Row click: if the row is navigable, the entire row is a link — not just an action button

**Sensitive data in tables (patient names, diagnoses):**
- Patient names render as `First Last` — never show full DOB or ID number in a table column
- File numbers render in `font-mono`
- Long text fields (diagnosis, notes) truncate with `truncate max-w-[200px]` and show full content in a tooltip

---

## 7. NAVIGATION & ROUTING

### Breadcrumbs
Required on all detail pages (depth ≥ 2):
```tsx
// e.g. Patients > John Kamau > Surgical Plan
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem><BreadcrumbLink href="/patients">Patients</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem><BreadcrumbLink href={`/patients/${id}`}>{patientName}</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem><BreadcrumbPage>Surgical Plan</BreadcrumbPage></BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### Back Navigation
Always provide an explicit back link on detail pages — never rely solely on the browser back button:
```tsx
<Button variant="ghost" size="sm" asChild>
  <Link href={previousRoute}>
    <ArrowLeft className="h-4 w-4 mr-1" />
    Back to {contextLabel}
  </Link>
</Button>
```

### Active Link States
Sidebar nav items: use `cn()` to apply `bg-accent text-accent-foreground` on the active route. Never use raw conditional className strings.

---

## 8. MULTI-STEP FORMS

Used for: surgical case plan, patient intake, consultation flow.

### Step Indicator
Render above the form, not inside it:
```tsx
// Step indicator pattern
<div className="flex items-center gap-2 mb-8">
  {steps.map((step, index) => (
    <React.Fragment key={step}>
      <div className={cn(
        "flex items-center gap-2 text-sm",
        index === currentStep && "text-foreground font-medium",
        index < currentStep && "text-muted-foreground",
        index > currentStep && "text-muted-foreground opacity-50"
      )}>
        <div className={cn(
          "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium border",
          index === currentStep && "bg-primary text-primary-foreground border-primary",
          index < currentStep && "bg-muted text-muted-foreground border-border",
          index > currentStep && "bg-transparent text-muted-foreground border-border"
        )}>
          {index < currentStep ? <Check className="h-3 w-3" /> : index + 1}
        </div>
        {step}
      </div>
      {index < steps.length - 1 && (
        <div className={cn(
          "h-px flex-1 bg-border",
          index < currentStep && "bg-primary"
        )} />
      )}
    </React.Fragment>
  ))}
</div>
```

### Multi-Step Rules
- **Validate before advancing** — never allow proceeding with invalid Page 1 data
- **Preserve data on back navigation** — going back must not clear completed fields
- **Page 2 receives Page 1 data as props** — do not re-fetch what was already submitted
- **Show a summary on final step** if the form is complex (≥ 8 fields across steps)
- **The Back button never submits** — it is always a pure navigation action

---

## 9. CONDITIONAL UI

Conditional fields (e.g. device type appears only for liposuction) must:

1. **Animate in/out** — use a simple fade or height transition, not an abrupt mount/unmount:
```tsx
{showConditionalField && (
  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
    <FormField ... />
  </div>
)}
```

2. **Clear their value when hidden** — use `form.setValue('device_used', undefined)` when the condition becomes false

3. **Never shift layout dramatically** — place conditional fields at the bottom of their section so their appearance doesn't reorder existing fields

---

## 10. ACCESSIBILITY

Non-negotiable minimums:
- All form inputs have an associated `<label>` via `FormLabel` — never skip it
- Icon-only buttons have `aria-label`
- Colour is never the sole differentiator — pair with icon or text
- Focus rings must be visible — do not add `outline-none` without a replacement focus style
- Destructive actions must have a confirmation step (`AlertDialog`) before executing

---

## 11. SERVER COMPONENT vs CLIENT COMPONENT DECISION TREE

```
Does this component fetch data?
  └─ Yes → Server Component by default
      └─ Does it also need interactivity (onClick, useState, forms)?
           └─ Yes → Keep fetch in Server Component, pass data to a 'use client' child

Does this component only handle interaction (form, toggle, modal)?
  └─ Yes → 'use client'

Does this component only render static/passed data?
  └─ Yes → Server Component (no directive needed)
```

**Never put a server action call directly inside a Server Component render** — use a client component with a form action or button handler.

---

## 12. PERFORMANCE RULES

- **Images:** Always use `next/image` — never raw `<img>` tags
- **Dynamic imports:** Use `next/dynamic` with `{ ssr: false }` for heavy client-only components (rich text editors, chart libraries, PDF viewers)
- **Avoid prop drilling > 2 levels** — use composition or context for shared state
- **Suspense boundaries:** Wrap async Server Components in `<Suspense fallback={<Skeleton />}>` — never let the entire page suspend on a slow secondary data fetch

---

## 13. NAMING CONVENTIONS

| Thing | Convention | Example |
|---|---|---|
| Component files | PascalCase | `SurgicalPlanShell.tsx` |
| Hook files | camelCase with `use` prefix | `useSurgicalCase.ts` |
| Server action files | kebab-case | `surgical-case-plan.ts` |
| Type files | kebab-case `.types.ts` | `surgical-plan.types.ts` |
| Constants files | kebab-case `.constants.ts` | `procedure-categories.constants.ts` |
| Zod schemas | camelCase with `Schema` suffix | `page1Schema`, `updateCasePlanSchema` |
| Component props interfaces | PascalCase with `Props` suffix | `CaseIdentificationFormProps` |

---

## 16. PATIENT-FACING SURFACES

Patient-facing UI (portal, appointment booking, results view, consent forms) operates under **different design rules** from clinical staff tools. Patients are not trained users — they may be anxious, unfamiliar with medical terminology, and accessing on mobile.

### Surface Identity
Patient surfaces communicate **warmth within precision**. The slate foundation remains, but the density drops, type gets larger, and the tone becomes reassuring rather than utilitarian.

### Key Differences from Clinical UI

| Dimension | Clinical (Staff) | Patient-Facing |
|---|---|---|
| Type size base | `text-sm` | `text-base` |
| Layout density | Compact, data-rich | Generous spacing, single focus per screen |
| Terminology | Medical (e.g. "abdominoplasty") | Plain language with medical term in parentheses |
| Error messages | Specific, technical | Reassuring, actionable ("Please check your date of birth") |
| Primary actions | Multiple per page | One per screen — one clear next step |
| Navigation | Sidebar with many items | Linear progress, no global nav during flows |
| Empty states | Minimal | Warm, explanatory, with next step guidance |

### Patient Layout Pattern
```tsx
// Patient-facing page wrapper
<div className="min-h-screen bg-slate-50">
  <header className="border-b border-slate-200 bg-white px-6 py-4">
    {/* Logo + minimal nav */}
  </header>
  <main className="mx-auto max-w-lg px-4 py-10">
    {/* Single focused content block */}
  </main>
</div>
```

### Patient Typography Adjustments
```
Page heading:    text-2xl font-semibold tracking-tight (same as clinical)
Body / labels:   text-base (bumped up from text-sm)
Supporting:      text-sm text-slate-500
Instruction text: text-base text-slate-600 leading-relaxed
```

### Patient Trust Signals — Required on Key Screens
- Appointment confirmation: show clinic name, address, contact number
- Consent forms: show doctor name and date prominently before signature
- Results / reports: always include a "Questions? Contact the clinic" footer link
- Payment screens: show security indicator and clinic registration details

### Patient Form Rules
- One question per screen for multi-step intake flows — never a long scrolling form
- Progress bar required for flows > 3 steps
- Every field must have a `placeholder` with an example value
- Required fields: mark with "Required" text, not just an asterisk
- Date inputs on mobile: use native `<input type="date">` — not a custom date picker
- Never ask for information the clinic already has from the booking

### Plain Language Pairs — Always Use in Patient UI
```
abdominoplasty          → tummy tuck (abdominoplasty)
mastopexy               → breast lift (mastopexy)
blepharoplasty          → eyelid surgery (blepharoplasty)
rhinoplasty             → nose reshaping (rhinoplasty)
brachioplasty           → arm lift (brachioplasty)
lipectomy               → body lift (lipectomy)
gynecomastia surgery    → male chest reduction (gynecomastia surgery)
```

---

## 17. ANTI-PATTERNS — NEVER DO THESE

| Anti-pattern | Why | Instead |
|---|---|---|
| `className="text-[#3b82f6]"` | Breaks theme system | Use `text-primary` or semantic slate colour |
| `style={{ marginTop: 16 }}` | Bypasses Tailwind | Use `mt-4` |
| Raw `<input type="text" />` without library primitive | No form integration, no accessibility | Use library Input inside Form wrapper |
| `disabled={true}` input for read-only | Misleads the user | Use a `<p>` or `<span>` display |
| Toast for form validation errors | User misses it | Use inline field error message |
| `any` type | Defeats TypeScript | Type it properly or use `unknown` with a guard |
| `// @ts-ignore` | Hides real bugs | Fix the type error |
| Nesting `<a>` inside `<button>` | Invalid HTML | Use `asChild` on `Button` with `Link` |
| `onClick` on non-interactive elements | Accessibility failure | Use `<button>` or `<Link>` |
| Fetching data in a `useEffect` on mount | Waterfall, no cache | Use Server Component or server action |
| Purple/indigo gradients on clinical surfaces | Off-brand, decorative | Flat slate surfaces only |
| Medical jargon in patient-facing UI without plain language pair | Confusing to patients | Always pair: "rhinoplasty (nose reshaping)" |
| Long scrolling form in patient intake flow | Overwhelming, high drop-off | One question per screen |
| Mixing two component libraries on the same surface | Inconsistent, bundle bloat | Pick one and use it exclusively |
| Building a custom modal/select when library has one | Reinventing the wheel, accessibility gaps | Use library primitive |

---

## 18. QUICK REFERENCE CHECKLIST

Before submitting any UI implementation, verify:

**Universal**
- [ ] Component library confirmed via discovery gate before writing any component
- [ ] No `any` types
- [ ] No hardcoded hex colours — semantic tokens or Tailwind slate scale only
- [ ] No inline styles
- [ ] Loading state on every async action
- [ ] Error state rendered inline, not only as toast
- [ ] Empty state on every list/table
- [ ] Read-only data rendered as `<p>` not disabled `<Input>`
- [ ] `next/image` for all images
- [ ] `aria-label` on all icon-only buttons
- [ ] Destructive actions behind confirmation dialog

**Clinical (Staff) Surfaces**
- [ ] All form fields use library Form primitives with explicit label association
- [ ] Breadcrumbs on detail pages (depth ≥ 2)
- [ ] Back navigation link present
- [ ] Conditional fields clear their value when hidden
- [ ] Patient names / file numbers in `font-mono` in tables
- [ ] Status badges have border + label + (optionally) icon — not colour alone

**Patient-Facing Surfaces**
- [ ] Body text uses `text-base` minimum — not `text-sm`
- [ ] Medical terms paired with plain language equivalent
- [ ] Multi-step intake: one question per screen
- [ ] Progress bar present if flow > 3 steps
- [ ] Trust signals present on confirmation, consent, and payment screens
- [ ] Date inputs use native `<input type="date">` on mobile flows
- [ ] Required fields labelled with "Required" text, not asterisk alone

