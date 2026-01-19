# Service Integration Strategy

## Core Principle

**We are NOT rebuilding the website.**  
The client already has [nairobisculpt.com](https://www.nairobisculpt.com) with comprehensive service information.

**Our goal:** Enhance the PATIENT PORTAL experience by intelligently leveraging website content to improve consultation booking.

## Website Structure Analysis

### Services Page (https://www.nairobisculpt.com/services.html)

**Categorization:**
- Facial Procedures (6 services)
- Body Procedures (3 services)  
- Breast Procedures (4 services)
- Skin and Scar Treatments (4 services)
- Non-Surgical Treatments (2 services)

**Features:**
- Category filtering
- Visual service cards
- Direct links to detailed service pages

### Service Detail Pages

Each service has a dedicated page with:
- **Detailed description** (what it is, who it's for)
- **Benefits** (what patients can expect)
- **Procedure overview** (what happens during treatment)
- **Recovery information** (what to expect after)
- **Candidacy criteria** (who is a good candidate)
- **Why choose Nairobi Sculpt** (trust signals)

**Example Pages:**
- Facelift: https://www.nairobisculpt.com/facelift.html
- BBL: https://www.nairobisculpt.com/bbl.html
- Breast Augmentation: https://www.nairobisculpt.com/breast-augmentation.html
- Scar Management: https://www.nairobisculpt.com/scar-management.html
- Non-Surgical: https://www.nairobisculpt.com/non-surgical.html

## Integration Strategy

### 1. Enhanced Service Selection (Step 2)

**Current:** Simple list of service cards

**Enhanced:**
- **Group by category** (matching website structure)
- **Better descriptions** (extracted from website)
- **"Learn More" links** (direct to website service page)
- **Visual grouping** (accordions or tabs by category)

**Why:**
- Helps patients find services they're interested in
- Maintains consistency with website
- Provides trust (links to detailed information)
- Reduces anxiety (patients can learn more before booking)

### 2. Service Information Tooltips/Modals

**Enhancement:**
- When hovering/clicking a service card → Show quick preview
- Key info: "Who it's for", "What to expect", "Recovery time"
- Link to full website page for detailed information

**Why:**
- Reduces cognitive load in booking form
- Provides quick context without leaving page
- Encourages informed decisions

### 3. Smart Service Recommendations

**Enhancement:**
- Based on selected category → Show related services
- "Patients who booked X also considered Y"
- Group related procedures (e.g., Facelift + Brow Lift)

**Why:**
- Helps patients discover relevant options
- Educational (informs about combinations)
- Increases consultation quality

### 4. Category-Based Filtering

**Enhancement:**
- Filter buttons at top of Step 2: "All", "Facial", "Body", "Breast", "Skin/Scar", "Non-Surgical"
- Matches website filtering behavior
- Familiar UX pattern

**Why:**
- Reduces overwhelming long list
- Matches website UX (consistency)
- Mobile-friendly (easier to navigate)

## Implementation Plan

### Phase 1: Enhanced Service Data

1. **Extract detailed descriptions** from website service pages
2. **Update seed script** with richer content
3. **Add website URLs** to service records (for "Learn More" links)
4. **Preserve categories** exactly as on website

### Phase 2: Enhanced Step 2 UI

1. **Add category filtering** (All, Facial, Body, Breast, Skin/Scar, Non-Surgical)
2. **Group services by category** in UI
3. **Add "Learn More" links** to website service pages
4. **Enhanced service cards** with better descriptions

### Phase 3: Service Information Modal (Optional)

1. **Quick preview modal** when clicking service
2. **Key highlights** from website page
3. **Direct link** to full website page

## Database Schema Enhancement

**Add to Service model:**
```prisma
model Service {
  // ... existing fields ...
  
  website_url String?  // Link to website service page (e.g., /facelift.html)
  detailed_description String?  // Richer description from website
  candidacy_criteria String?  // Who is a good candidate
  recovery_info String?  // Quick recovery summary
}
```

**Or:** Keep website URLs separate, link directly to website (simpler approach).

## User Experience Flow

**Enhanced Step 2:**

1. **Category Filter** (at top)
   - "All Services" | "Facial" | "Body" | "Breast" | "Skin/Scar" | "Non-Surgical"
   - Visual filter buttons, mobile-friendly

2. **Service Cards** (grouped by category)
   - Category header (if filtering)
   - Service card with:
     - Service name
     - Short description
     - "Learn More" link (opens website in new tab)
   - Clear selection state

3. **Selection**
   - Selected service highlighted
   - Can still add concern description below

**Benefits:**
- ✅ Familiar (matches website)
- ✅ Educational (can learn more)
- ✅ Non-intrusive (website stays as source of truth)
- ✅ Reduces form complexity

## Technical Implementation

### 1. Update Service Schema (Optional)

If we want to store website URLs in database:
- Add `website_url` field to Service model
- Run migration

**Or simpler:** Generate URLs from service_name (e.g., "Facelift" → "/facelift.html")

### 2. Update Seed Script

- Extract descriptions from website pages
- Add website URLs (or generate from service name)
- Preserve exact categories from website

### 3. Update Step 2 Component

- Add category filter state
- Filter services by category
- Group display by category
- Add "Learn More" links

### 4. Service URLs Pattern

Based on website structure:
- "Facelift" → `https://www.nairobisculpt.com/facelift.html`
- "Brazilian Butt Lift" → `https://www.nairobisculpt.com/bbl.html`
- "Breast Augmentation" → `https://www.nairobisculpt.com/breast-augmentation.html`
- "Scar Management" → `https://www.nairobisculpt.com/scar-management.html`
- "Non-Surgical Treatments" → `https://www.nairobisculpt.com/non-surgical.html`

**Pattern:** Service name → kebab-case → `.html`

## Success Criteria

✅ **Services match website structure** (categories, names)  
✅ **"Learn More" links to website** (maintains website as source of truth)  
✅ **Category filtering works** (mobile-friendly)  
✅ **Patient can select service** (existing flow preserved)  
✅ **Enhances without overwhelming** (progressive disclosure)  

## Next Steps

1. ✅ Extract service descriptions from website pages
2. ✅ Update seed script with enhanced data
3. ✅ Add category filtering to Step 2
4. ✅ Add "Learn More" links to service cards
5. ⏭️ Optional: Add service preview modal
