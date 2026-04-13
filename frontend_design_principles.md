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
Components:      shadcn/ui (Radix primitives) as the base layer
Icons:           lucide-react exclusively — no other icon libraries
Forms:           react-hook-form + zodResolver — no uncontrolled inputs
State:           useState / useReducer for local; server actions for mutations
Data fetching:   Server Components by default; 'use client' only when interaction requires it
Types:           No `any`. No type assertions (`as X`) without a comment justifying it
```

**Before writing any component:** search the codebase for an existing shadcn/ui component that covers the need. Only build custom primitives when shadcn has no equivalent.

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

### Palette Philosophy
Use CSS variables from the shadcn theme. Never hardcode hex values in components.

```
background / foreground          — page surfaces and primary text
card / card-foreground           — elevated surfaces (forms, panels)
muted / muted-foreground         — secondary surfaces and supporting text
border                           — all dividers, input borders, separators
primary / primary-foreground     — CTAs, active states, key actions
destructive / destructive-foreground — errors, deletions, irreversible actions
```

### Colour Usage Rules

**Status colours** — use semantic classes, never raw colours:
```tsx
// ✅ Correct
<Badge variant="destructive">Cancelled</Badge>
<span className="text-emerald-600 dark:text-emerald-400">Complete</span>

// ❌ Wrong
<span style={{ color: '#ef4444' }}>Cancelled</span>
<span className="text-red-500">Cancelled</span>  // too raw, not semantic
```

**Status badge conventions for Nairobi Sculpt:**
| Status | Colour approach |
|---|---|
| Completed / Active / Ready | `text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950` |
| Pending / In Progress / Draft | `text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950` |
| Cancelled / Failed / Overdue | `text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950` |
| Scheduled / Upcoming | `text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950` |
| Neutral / Unknown | `text-muted-foreground bg-muted` |

**Never use colour alone to convey meaning** — always pair with a label, icon, or both.

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
Always use shadcn `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`.
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

**Never render raw `<label>` + `<input>` pairs** — always go through the Form primitive.

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

## 14. ANTI-PATTERNS — NEVER DO THESE

| Anti-pattern | Why | Instead |
|---|---|---|
| `className="text-[#3b82f6]"` | Breaks theme system | Use `text-primary` or semantic colour |
| `style={{ marginTop: 16 }}` | Bypasses Tailwind | Use `mt-4` |
| `<input type="text" />` raw | No form integration | Use shadcn `Input` inside `FormField` |
| `disabled={true}` input for read-only | Misleads the user | Use a `<p>` or `<span>` display |
| Toast for form validation errors | User misses it | Use inline `FormMessage` |
| `any` type | Defeats TypeScript | Type it properly or use `unknown` with a guard |
| `// @ts-ignore` | Hides real bugs | Fix the type error |
| Nesting `<a>` inside `<button>` | Invalid HTML | Use `asChild` on `Button` with `Link` |
| `onClick` on non-interactive elements | Accessibility failure | Use `<button>` or `<Link>` |
| Fetching data in a `useEffect` on mount | Waterfall, no cache | Use Server Component or React Query |

---

## 15. QUICK REFERENCE CHECKLIST

Before submitting any UI implementation, verify:

- [ ] No `any` types
- [ ] All form fields use shadcn Form primitives
- [ ] Loading state on every async action
- [ ] Error state rendered inline, not only as toast
- [ ] Empty state on every list/table
- [ ] Read-only data rendered as `<p>` not disabled `<Input>`
- [ ] Breadcrumbs on detail pages
- [ ] Back navigation link present
- [ ] Conditional fields clear their value when hidden
- [ ] No hardcoded hex colours
- [ ] No inline styles
- [ ] `next/image` for all images
- [ ] `aria-label` on all icon-only buttons
- [ ] Destructive actions behind `AlertDialog` confirmation