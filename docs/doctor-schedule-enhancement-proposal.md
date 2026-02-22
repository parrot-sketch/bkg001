# Doctor Schedule Enhancement Proposal

## Executive Summary

This document outlines a comprehensive enhancement plan for the doctor schedule/availability feature, addressing rigidity, integration with external calendars (Google Calendar), and a complete UI/UX redesign.

---

## 1. Current Limitations & Critique

### 1.1 Rigidity Issues

#### **Problem: Hardcoded Presets**
```typescript
// Current: Only 9 fixed presets
const PRESET_CONFIG = {
  business: '9 am – 5 pm Mon–Fri',
  morning: '7 am – 1 pm Mon–Fri',
  // ... 7 more fixed options
}
```

**Issues:**
- ❌ No custom time ranges (e.g., 8:30 AM - 4:45 PM)
- ❌ No custom days (e.g., Mon-Wed-Fri only)
- ❌ No ability to save custom templates
- ❌ Presets replace all slots (destructive, no merge option)
- ❌ No timezone awareness
- ❌ No recurring exceptions (e.g., "Every 2nd Friday off")

#### **Problem: Limited Slot Configuration**
- ❌ No UI for `SlotConfiguration` (duration, interval, buffer)
- ❌ Fixed 30-minute duration, 15-minute interval
- ❌ No per-session customization (e.g., morning slots = 20min, afternoon = 45min)

#### **Problem: Poor Customization**
- ❌ Can't duplicate days (e.g., copy Monday to Tuesday)
- ❌ Can't bulk edit (e.g., "Set all weekdays to 9-5")
- ❌ No templates library (e.g., "Summer Schedule", "Part-Time")
- ❌ No import/export functionality

### 1.2 UI/UX Issues

#### **Visual Problems:**
- ❌ Cluttered interface with too many buttons
- ❌ Unclear visual hierarchy
- ❌ Poor mobile responsiveness
- ❌ Confusing drag-and-drop (no visual feedback)
- ❌ No undo/redo functionality
- ❌ Preset buttons are too small and cramped

#### **Usability Problems:**
- ❌ No preview of generated slots
- ❌ No validation feedback (e.g., "Overlapping slots")
- ❌ No bulk operations
- ❌ No search/filter for slots
- ❌ No keyboard shortcuts
- ❌ No help/tooltips

#### **Information Architecture:**
- ❌ Settings panel is overwhelming
- ❌ No clear separation between "template" and "calendar view"
- ❌ Summary panel is hard to scan
- ❌ No visual indication of saved vs. unsaved changes

---

## 2. Google Calendar Integration

### 2.1 Overview

**Goal**: Allow doctors to manage availability directly from Google Calendar, with bidirectional sync.

### 2.2 Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Google Calendar│ ◄─────► │  Sync Service    │ ◄─────► │  Our Database   │
│  (Doctor's)     │  OAuth  │  (Background Job)│  API    │  Availability   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

### 2.3 Integration Flow

#### **Phase 1: One-Way Sync (Google → Our System)**
1. Doctor connects Google Calendar account
2. System reads Google Calendar events
3. Maps Google events to availability:
   - **Busy events** → Blocks (unavailable)
   - **Free time** → Available slots
   - **Recurring events** → Recurring blocks/availability
4. Updates our `AvailabilityTemplate` and `ScheduleBlock` tables

#### **Phase 2: Two-Way Sync**
1. Doctor creates appointment in our system
2. System creates event in Google Calendar
3. Doctor modifies event in Google Calendar
4. System syncs changes back to our database

### 2.4 Technical Implementation

#### **Required Packages:**
```bash
pnpm add googleapis google-auth-library
```

#### **Database Schema Changes:**
```prisma
model CalendarIntegration {
  id                String   @id @default(uuid())
  doctor_id         String   @unique
  provider          String   // "GOOGLE", "OUTLOOK", "APPLE"
  access_token      String   @db.Text
  refresh_token     String?  @db.Text
  token_expires_at  DateTime?
  calendar_id       String?  // Google Calendar ID
  sync_enabled      Boolean  @default(true)
  sync_direction    String   @default("BIDIRECTIONAL") // "ONE_WAY_IN", "ONE_WAY_OUT", "BIDIRECTIONAL"
  last_sync_at      DateTime?
  sync_frequency    Int      @default(15) // minutes
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  
  doctor            Doctor   @relation(fields: [doctor_id], references: [id], onDelete: Cascade)
  
  @@index([doctor_id])
}

model CalendarSyncLog {
  id                String   @id @default(uuid())
  integration_id    String
  sync_type         String   // "FULL", "INCREMENTAL"
  status            String   // "SUCCESS", "FAILED", "PARTIAL"
  events_synced     Int      @default(0)
  errors            Json?    // Array of error messages
  started_at        DateTime @default(now())
  completed_at      DateTime?
  
  integration       CalendarIntegration @relation(fields: [integration_id], references: [id], onDelete: Cascade)
  
  @@index([integration_id, started_at])
}
```

#### **API Routes:**
```
POST   /api/doctors/calendar/connect/google
GET    /api/doctors/calendar/status
POST   /api/doctors/calendar/sync
DELETE /api/doctors/calendar/disconnect
GET    /api/doctors/calendar/events
```

#### **Background Job:**
```typescript
// lib/jobs/calendar-sync.ts
export async function syncGoogleCalendar(doctorId: string) {
  // 1. Get integration
  const integration = await db.calendarIntegration.findUnique({
    where: { doctor_id: doctorId }
  });
  
  // 2. Authenticate with Google
  const oauth2Client = new google.auth.OAuth2(...);
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token
  });
  
  // 3. Fetch events from Google Calendar
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const events = await calendar.events.list({
    calendarId: integration.calendar_id || 'primary',
    timeMin: new Date().toISOString(),
    timeMax: addMonths(new Date(), 3).toISOString(),
    singleEvents: true,
    orderBy: 'startTime'
  });
  
  // 4. Map to our availability model
  const blocks = events.data.items
    .filter(e => e.status !== 'cancelled')
    .map(e => ({
      startDate: new Date(e.start.dateTime || e.start.date),
      endDate: new Date(e.end.dateTime || e.end.date),
      reason: e.summary || 'Google Calendar event',
      blockType: 'GOOGLE_SYNC'
    }));
  
  // 5. Update ScheduleBlock table
  await db.scheduleBlock.createMany({ data: blocks });
  
  // 6. Log sync
  await db.calendarSyncLog.create({ data: { ... } });
}
```

### 2.5 OAuth Flow

```typescript
// app/api/doctors/calendar/connect/google/route.ts
export async function GET(request: NextRequest) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/doctors/calendar/oauth/callback`
  );
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    prompt: 'consent'
  });
  
  return NextResponse.redirect(authUrl);
}

// app/api/doctors/calendar/oauth/callback/route.ts
export async function GET(request: NextRequest) {
  const { code } = request.nextUrl.searchParams;
  
  const oauth2Client = new google.auth.OAuth2(...);
  const { tokens } = await oauth2Client.getToken(code);
  
  // Save tokens to database
  await db.calendarIntegration.upsert({
    where: { doctor_id: userId },
    create: {
      doctor_id: userId,
      provider: 'GOOGLE',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : null
    },
    update: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : null
    }
  });
  
  return NextResponse.redirect('/doctor/schedule?connected=google');
}
```

### 2.6 Sync Strategy

#### **Event Mapping Rules:**
- **Google "Busy" events** → `ScheduleBlock` (unavailable)
- **Google "Free" time** → Available slots (if within working hours)
- **Recurring events** → Recurring blocks
- **All-day events** → Full-day blocks

#### **Conflict Resolution:**
- **Priority**: Manual blocks > Google sync > Template
- **Merge strategy**: Google events are additive (don't delete manual blocks)

### 2.7 Impact on Application

#### **Positive Impacts:**
✅ Doctors use familiar tool (Google Calendar)
✅ Reduces duplicate data entry
✅ Real-time availability updates
✅ Better mobile experience (via Google Calendar app)
✅ Supports multiple calendars (work, personal)

#### **Challenges:**
⚠️ OAuth token management (refresh tokens)
⚠️ Rate limiting (Google API quotas)
⚠️ Sync conflicts (manual vs. Google changes)
⚠️ Privacy concerns (calendar access)
⚠️ Offline support (sync when online)

#### **Performance Considerations:**
- Sync job runs every 15 minutes (configurable)
- Incremental sync (only changed events)
- Background queue (BullMQ/Redis) for sync jobs
- Caching of calendar events (5-minute TTL)

---

## 3. Alternative Calendar Options

### 3.1 Microsoft Outlook / Office 365

**Pros:**
- Enterprise-friendly
- Good API (Microsoft Graph)
- Supports multiple accounts

**Cons:**
- More complex OAuth flow
- Requires Azure AD setup

**Implementation:**
```typescript
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';

const client = Client.initWithMiddleware({
  authProvider: new TokenCredentialAuthenticationProvider(credential)
});

const events = await client
  .api('/me/calendar/events')
  .get();
```

### 3.2 Apple iCloud Calendar

**Pros:**
- Native iOS/macOS integration
- Privacy-focused

**Cons:**
- No official API (requires CalDAV)
- Complex authentication
- Limited documentation

**Implementation:**
- Use CalDAV protocol (dav) library
- Requires Apple ID credentials

### 3.3 CalDAV (Generic)

**Pros:**
- Works with any CalDAV server
- Standard protocol
- Self-hosted options

**Cons:**
- More complex implementation
- Less user-friendly

**Implementation:**
```typescript
import { createClient } from 'dav';

const client = createClient({
  serverUrl: 'https://caldav.example.com',
  credentials: {
    username: 'user@example.com',
    password: 'password'
  }
});

const calendars = await client.findCalendars();
const events = await client.fetchCalendarObjects({ calendar: calendars[0] });
```

### 3.4 Recommendation

**Priority Order:**
1. **Google Calendar** (easiest, most users)
2. **Microsoft Outlook** (enterprise demand)
3. **CalDAV** (generic, future-proof)
4. **Apple iCloud** (niche, complex)

**Multi-Provider Support:**
- Abstract calendar provider interface
- Support multiple providers simultaneously
- Let doctors choose their preferred calendar

---

## 4. Configuration Steps

### 4.1 Google Calendar Setup

#### **Step 1: Google Cloud Console**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable "Google Calendar API"
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://yourdomain.com/api/doctors/calendar/oauth/callback`
5. Copy Client ID and Client Secret

#### **Step 2: Environment Variables**
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/doctors/calendar/oauth/callback
```

#### **Step 3: Database Migration**
```bash
npx prisma migrate dev --name add_calendar_integration
```

#### **Step 4: Background Job Setup**
```typescript
// lib/jobs/scheduler.ts
import { Queue } from 'bullmq';

export const calendarSyncQueue = new Queue('calendar-sync', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
});

// Worker
calendarSyncQueue.process(async (job) => {
  const { doctorId } = job.data;
  await syncGoogleCalendar(doctorId);
});

// Schedule recurring sync (every 15 minutes)
setInterval(async () => {
  const integrations = await db.calendarIntegration.findMany({
    where: { sync_enabled: true, provider: 'GOOGLE' }
  });
  
  for (const integration of integrations) {
    await calendarSyncQueue.add('sync', { doctorId: integration.doctor_id });
  }
}, 15 * 60 * 1000);
```

### 4.2 User Onboarding Flow

1. **Doctor visits** `/doctor/schedule`
2. **Sees banner**: "Connect Google Calendar to sync availability"
3. **Clicks "Connect"** → Redirects to Google OAuth
4. **Grants permissions** → Redirects back with tokens
5. **System syncs** → Shows "Synced X events from Google Calendar"
6. **Doctor can toggle** sync on/off, choose sync direction

---

## 5. UI/UX Redesign Proposal

### 5.1 Design Principles

1. **Clarity**: Clear visual hierarchy, obvious actions
2. **Flexibility**: Custom time ranges, templates, bulk operations
3. **Feedback**: Real-time validation, undo/redo, preview
4. **Modern**: Sleek design, smooth animations, responsive
5. **Efficiency**: Keyboard shortcuts, bulk operations, templates

### 5.2 New UI Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Schedule Management                    [Connect Calendar]  │
├─────────────────────────────────────────────────────────────┤
│  [Template] [Calendar View] [Settings] [Sync Status]       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Weekly Template Editor                           │     │
│  │  ┌──────────────────────────────────────────────┐ │     │
│  │  │  Mon  │  Tue  │  Wed  │  Thu  │  Fri  │ ... │ │     │
│  │  ├───────┼───────┼───────┼───────┼───────┼─────┤ │     │
│  │  │ 09:00 │ 09:00 │ 09:00 │ 09:00 │ 09:00 │ ... │ │     │
│  │  │ 17:00 │ 17:00 │ 17:00 │ 17:00 │ 17:00 │ ... │ │     │
│  │  │ [Edit]│ [Edit]│ [Edit]│ [Edit]│ [Edit]│ ... │ │     │
│  │  └──────────────────────────────────────────────┘ │     │
│  │                                                     │     │
│  │  [Quick Actions]                                   │     │
│  │  [Copy Mon to All] [Set 9-5 Weekdays] [Clear All] │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Custom Templates                                   │     │
│  │  [Summer Schedule] [Part-Time] [+ Create New]     │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Slot Configuration                                 │     │
│  │  Default Duration: [30] min                        │     │
│  │  Slot Interval: [15] min                           │     │
│  │  Buffer Time: [0] min                               │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  [Save Changes] [Preview Slots] [Undo] [Redo]               │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Component Redesign

#### **New Components:**

1. **`ScheduleTemplateEditor`**
   - Grid-based layout (7 days × time slots)
   - Drag to create/resize slots
   - Click to edit (opens time picker)
   - Visual feedback (hover, selected states)
   - Keyboard shortcuts (Arrow keys, Delete, Copy)

2. **`TimeRangePicker`**
   - Custom time input (not just preset hours)
   - Visual time slider
   - Validation (no overlaps, within 24h)

3. **`TemplateLibrary`**
   - Saved templates (Summer, Part-Time, etc.)
   - Import/export JSON
   - Share templates (admin feature)

4. **`SlotConfigurationPanel`**
   - Duration, interval, buffer controls
   - Per-session overrides
   - Preview generated slots

5. **`CalendarSyncStatus`**
   - Connection status
   - Last sync time
   - Sync errors
   - Manual sync button

### 5.4 Visual Design

#### **Color Scheme:**
- **Primary**: Teal/Blue (medical, professional)
- **Available**: Green (#10b981)
- **Unavailable**: Red (#ef4444)
- **Pending**: Amber (#f59e0b)
- **Background**: Light gray (#f9fafb)

#### **Typography:**
- **Headings**: Inter Bold
- **Body**: Inter Regular
- **Monospace**: Time displays (JetBrains Mono)

#### **Spacing:**
- **Grid**: 8px base unit
- **Cards**: 16px padding
- **Sections**: 24px gap

#### **Animations:**
- **Slot creation**: Fade in (200ms)
- **Drag feedback**: Scale up (150ms)
- **Save**: Success toast (3s)
- **Loading**: Skeleton screens

### 5.5 Responsive Design

#### **Mobile (< 768px):**
- Stack days vertically
- Touch-friendly buttons (44px min)
- Swipe to navigate days
- Bottom sheet for time picker

#### **Tablet (768px - 1024px):**
- 2-3 days per row
- Larger touch targets
- Sidebar for settings

#### **Desktop (> 1024px):**
- Full 7-day grid
- Hover states
- Keyboard shortcuts
- Multi-select

---

## 6. Implementation Plan

### Phase 1: UI/UX Redesign (2-3 weeks)
- [ ] Redesign `ScheduleSettingsPanel`
- [ ] Add custom time range picker
- [ ] Implement template library
- [ ] Add slot configuration UI
- [ ] Improve visual design
- [ ] Add undo/redo
- [ ] Mobile responsiveness

### Phase 2: Flexibility Enhancements (1-2 weeks)
- [ ] Custom time ranges (not just presets)
- [ ] Bulk operations (copy day, set all weekdays)
- [ ] Template save/load
- [ ] Import/export JSON
- [ ] Per-session slot configuration

### Phase 3: Google Calendar Integration (3-4 weeks)
- [ ] OAuth flow
- [ ] Database schema
- [ ] Sync service
- [ ] Background jobs
- [ ] UI for connection status
- [ ] Error handling

### Phase 4: Testing & Polish (1-2 weeks)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance optimization
- [ ] Documentation

**Total Timeline: 7-11 weeks**

---

## 7. Success Metrics

- **Adoption**: 80% of doctors connect Google Calendar within 30 days
- **Efficiency**: 50% reduction in time to configure schedule
- **Satisfaction**: 4.5+ star rating on schedule feature
- **Errors**: < 1% sync failures
- **Performance**: < 2s page load, < 500ms slot generation

---

## 8. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| OAuth token expiration | High | Auto-refresh tokens, clear error messages |
| Google API rate limits | Medium | Queue sync jobs, exponential backoff |
| Sync conflicts | Medium | Clear conflict resolution UI, manual override |
| Privacy concerns | High | Clear permissions, opt-in only, data encryption |
| Performance degradation | Medium | Caching, incremental sync, background jobs |

---

## 9. Next Steps

1. **Review & Approve** this proposal
2. **Create design mockups** (Figma)
3. **Set up Google Cloud project** (Dev environment)
4. **Implement Phase 1** (UI/UX redesign)
5. **User testing** with 5-10 doctors
6. **Iterate** based on feedback
7. **Implement Phase 2 & 3** (Features + Integration)

---

## Appendix: Code Examples

### Custom Time Range Picker
```typescript
// components/doctor/schedule/CustomTimeRangePicker.tsx
export function CustomTimeRangePicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <TimeInput
        value={value.start}
        onChange={(time) => onChange({ ...value, start: time })}
        step={15} // 15-minute increments
      />
      <span>to</span>
      <TimeInput
        value={value.end}
        onChange={(time) => onChange({ ...value, end: time })}
        step={15}
      />
    </div>
  );
}
```

### Template Library
```typescript
// components/doctor/schedule/TemplateLibrary.tsx
export function TemplateLibrary({ onSelectTemplate }) {
  const templates = useQuery(['templates'], fetchTemplates);
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {templates.data?.map(template => (
        <TemplateCard
          key={template.id}
          template={template}
          onClick={() => onSelectTemplate(template)}
        />
      ))}
      <CreateTemplateCard onClick={handleCreate} />
    </div>
  );
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2024-02-20  
**Author**: Development Team
