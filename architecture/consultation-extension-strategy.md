# Consultation Module — Extension Strategy

## 1. Design Philosophy

New capabilities must integrate **without modifying existing modules**.

The Consultation Workspace is the clinical cockpit. Over 5–10 years, it will accumulate AI assistance, voice dictation, lab ordering, imaging, referrals, real-time collaboration, and offline capabilities. If each feature requires modifying the core workspace, the workspace becomes a fragile monolith.

The extension strategy defines **how capabilities plug in**, not **where they live**.

---

## 2. Extension Model

### 2.1 Capability Plugin

A capability plugin is a self-contained unit that:

1. **Declares** its data dependencies
2. **Registers** its UI mount points (extension slots)
3. **Implements** its logic in an isolated feature module
4. **Communicates** through the event bus or provider interfaces
5. **Handles** its own loading, errors, and cleanup

```typescript
interface CapabilityPlugin {
  id: string;
  version: string;
  displayName: string;
  
  dependencies: string[]; // required capabilities/contexts
  permissions: Permission[]; // required permissions
  
  slots: ExtensionSlot[]; // UI mount points
  events: EventSubscription[]; // events this plugin listens to
  emits: string[]; // events this plugin emits
  
  initialize(context: ExtensionContext): void;
  activate(): void;
  deactivate(): void;
}
```

### 2.2 Extension Slot

An extension slot is a named mount point in the UI where a plugin can inject content.

```typescript
interface ExtensionSlot {
  id: string;
  location: SlotLocation;
  placement: 'before' | 'after' | 'replace';
  weight: number; // ordering within location
  conditions?: SlotCondition; // when this slot is visible
}

type SlotLocation =
  | 'sidebar.before-history"
  | "sidebar.after-vitals"
  | "workspace.subjective.before"
  | "workspace.subjective.after"
  | "workspace.objective.before"
  | "workspace.plan.before"
  | "workspace.plan.after"
  | "header.after-actions"
  | "queue.before-list"
  | "global.overlay";
```

### 2.3 Extension Context

When a plugin initializes, it receives an ExtensionContext that provides:

```typescript
interface ExtensionContext {
  // Read access to current session
  session: {
    getAppointment(): AppointmentResponseDto | null;
    getPatient(): PatientResponseDto | null;
    getConsultation(): ConsultationResponseDto | null;
    getNotes(): SOAPNote;
    getOutcome(): OutcomeType | null;
  };

  // Write access through well-defined mutators
  mutators: {
    updateNote(field: NoteField, value: string): void;
    setOutcome(outcome: OutcomeType): void;
    attachDocument(type: DocumentType, file: File): Promise<void>;
    addBillingItem(item: BillingItem): void;
  };

  // Event emission
  emit(event: ConsultationEvent): void;

  // UI controls
  ui: {
    showToast(message: string, type: ToastType): void;
    openModal(component: React.ComponentType): void;
    closeModal(): void;
    focusTab(tab: NoteTab): void;
  };

  // Infrastructure
  api: {
    consultationApi: ConsultationApi;
    patientApi: PatientApi;
    aiApi?: AIServiceApi;
    voiceApi?: VoiceDictationApi;
    labApi?: LabOrderApi;
    imagingApi?: ImagingApi;
    referralApi?: ReferralApi;
  };

  // Registration
  registerSlot(slot: ExtensionSlot, component: React.ComponentType): void;
  unregisterSlot(slotId: string): void;
}
```

---

## 3. Extension Registry

### 3.1 Registry Implementation

The Extension Registry is a domain service in the Shared Kernel:

```typescript
// shared-kernel/ExtensionRegistry.ts

class ExtensionRegistry {
  private plugins = new Map<string, CapabilityPlugin>();
  private slots = new Map<string, ExtensionSlot[]>();
  private eventHandlers = new Map<string, Set<(payload: any) => void>>();

  register(plugin: CapabilityPlugin): void {
    this.validateDependencies(plugin);
    this.plugins.set(plugin.id, plugin);
    
    // Register slots
    for (const slot of plugin.slots) {
      const existing = this.slots.get(slot.location) ?? [];
      existing.push(slot);
      this.slots.set(slot.location, existing.sort((a, b) => a.weight - b.weight));
    }

    // Register event handlers
    for (const event of plugin.events) {
      const handlers = this.eventHandlers.get(event.type) ?? new Set();
      handlers.add(event.handler);
      this.eventHandlers.set(event.type, handlers);
    }

    plugin.initialize(this.createContext(plugin));
    plugin.activate();
  }

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;
    
    plugin.deactivate();
    this.plugins.delete(pluginId);
    
    for (const slot of plugin.slots) {
      const existing = this.slots.get(slot.location) ?? [];
      this.slots.set(slot.location, existing.filter(s => s.id !== slot.id));
    }
  }

  getSlots(location: SlotLocation): ExtensionSlot[] {
    return this.slots.get(location) ?? [];
  }

  emit(event: ConsultationEvent): void {
    const handlers = this.eventHandlers.get(event.type) ?? new Set();
    handlers.forEach(handler => {
      try {
        handler(event.payload);
      } catch (error) {
        console.error(`Extension handler error for ${event.type}:`, error);
      }
    });
  }

  private validateDependencies(plugin: CapabilityPlugin): void {
    for (const dep of plugin.dependencies) {
      if (!this.plugins.has(dep) && !isCoreCapability(dep)) {
        throw new Error(`Plugin ${plugin.id} requires ${dep} which is not registered`);
      }
    }
  }

  private createContext(plugin: CapabilityPlugin): ExtensionContext {
    return {
      session: createSessionProxy(),
      mutators: createMutatorProxy(plugin.id),
      ui: createUIProxy(plugin.id),
      emit: (event) => this.emit({ type: event, payload: event.payload }),
      api: createApiProxy(plugin.id),
    };
  }
}
```

### 3.2 Registration Timing

```
SessionProvider initializes
    ↓
Core capabilities registered (patient, documentation, queue, timer)
    ↓
React Query prefetches initial data
    ↓
Workflow state → READY or ACTIVE
    ↓
Extension registry loads plugins from manifest
    ↓
Plugins with visible conditions mount their slots
    ↓
Workspace renders with extensions
```

---

## 4. Extension Points

### 4.1 Workspace Extension Points

| Slot Location | Current Content | Extension Purpose |
|---------------|-----------------|-------------------|
| `workspace.subjective.before` | (empty) | AI chief complaint suggestions, symptom checklists |
| `workspace.subjective.after` | (empty) | Voice dictation controls, template insertions |
| `workspace.objective.before` | (empty) | Vitals trend graphs, examination checklists |
| `workspace.objective.after` | (empty) | Imaging viewer, lab result preview |
| `workspace.assessment.before` | (empty) | Differential diagnosis helper, clinical decision support |
| `workspace.assessment.after` | (empty) | ICD-10 code suggestions |
| `workspace.plan.before` | (empty) | Medication interaction checker, order sets |
| `workspace.plan.after` | Outcome selector | Referral form, follow-up scheduler, surgical case preview |

### 4.2 Sidebar Extension Points

| Slot Location | Current Content | Extension Purpose |
|---------------|-----------------|-------------------|
| `sidebar.before-history` | Vitals, allergies, conditions | AI risk flags, care gaps |
| `sidebar.after-history` | Consultation history | Timeline filters, external records link |

### 4.3 Header Extension Points

| Slot Location | Current Content | Extension Purpose |
|---------------|-----------------|-------------------|
| `header.after-actions` | Save, Complete buttons | Collaboration indicators, presence avatars, offline sync status |

### 4.4 Queue Extension Points

| Slot Location | Current Content | Extension Purpose |
|---------------|-----------------|-------------------|
| `queue.before-list` | Queue header | Queue filters, search, group markers |
| `queue.after-list` | Queue footer | Batch actions, export, analytics summary |

### 4.5 Global Extension Points

| Slot Location | Current Content | Extension Purpose |
|---------------|-----------------|-------------------|
| `global.overlay` | (none by default) | Full-screen imaging viewer, collaborative whiteboard |

---

## 5. Extending for Specific Capabilities

### 5.1 AI Clinical Assistant

**Capability:** Provide AI-generated suggestions for chief complaint, assessment, and plan based on patient history and current symptoms.

**Plugin Registration:**
```typescript
const AIClinicalAssistantPlugin: CapabilityPlugin = {
  id: 'ai-clinical-assistant',
  version: '1.0.0',
  displayName: 'AI Clinical Assistant',
  dependencies: ['clinical-documentation', 'patient-context'],
  permissions: ['read:notes', 'read:patient-history', 'read:vitals'],
  
  slots: [
    {
      id: 'ai-suggestions-subjective',
      location: 'workspace.subjective.before',
      placement: 'before',
      weight: 10,
      conditions: { hasVitals: true, hasHistory: true },
    },
    {
      id: 'ai-suggestions-assessment',
      location: 'workspace.assessment.after',
      placement: 'after',
      weight: 10,
    },
  ],
  
  events: [
    { type: 'NOTE_UPDATED', handler: debounce(updateSuggestions, 1000) },
    { type: 'OUTCOME_CHANGED', handler: updateSuggestions },
  ],
  
  emits: ['AI_SUGGESTION_READY', 'AI_SUGGESTION_APPLIED'],
  
  initialize(context) {
    this.context = context;
    this.api = context.api.aiApi;
  },
  
  activate() {
    this.unsubscribe = this.context.emit.subscribe('NOTE_UPDATED', (payload) => {
      this.fetchSuggestions(payload.field);
    });
  },
  
  deactivate() {
    this.unsubscribe?.();
  },
};
```

**Integration Points:**
- Reads: `session.getNotes()`, `session.getPatient()`, `session.getConsultation()`
- Writes: `mutators.updateNote(field, value)` (when user accepts suggestion)
- Emits: `AI_SUGGESTION_READY` (to show suggestion badge)
- API: `context.api.aiApi.suggest({ notes, patient, history })`

**UI Component:**
```tsx
function AISuggestionPanel({ suggestions, onAccept }) {
  return (
    <div className="border border-[#e7d6bf] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-[#caa26a]" />
        <span className="text-xs font-semibold text-[#2c2e4b]">AI Suggestions</span>
      </div>
      {suggestions.map(suggestion => (
        <button
          key={suggestion.id}
          onClick={() => onAccept(suggestion)}
          className="w-full text-left text-xs p-2 rounded hover:bg-[#e7d6bf]/30 mb-1"
        >
          {suggestion.text}
        </button>
      ))}
    </div>
  );
}
```

---

### 5.2 Voice Dictation

**Capability:** Allow doctors to dictate SOAP notes using speech-to-text.

**Plugin Registration:**
```typescript
const VoiceDictationPlugin: CapabilityPlugin = {
  id: 'voice-dictation',
  version: '1.0.0',
  displayName: 'Voice Dictation',
  dependencies: ['clinical-documentation'],
  permissions: ['write:notes'],
  
  slots: [
    {
      id: 'voice-button-subjective',
      location: 'workspace.subjective.after',
      placement: 'after',
      weight: 5,
    },
    {
      id: 'voice-button-objective',
      location: 'workspace.objective.after',
      placement: 'after',
      weight: 5,
    },
    {
      id: 'voice-button-assessment',
      location: 'workspace.assessment.after",
      placement: "after",
      weight: 5,
    },
    {
      id: 'voice-button-plan',
      location: "workspace.plan.after",
      placement: "after",
      weight: 5,
    },
  ],
  
  events: [
    { type: 'NOTE_FIELD_FOCUSED', handler: ({ field }) => this.bindMicrophone(field) },
  ],
  
  emits: ['VOICE_TRANSCRIPT', 'VOICE_ERROR'],
  
  initialize(context) {
    this.context = context;
    this.api = context.api.voiceApi;
    this.activeField = null;
  },
  
  activate() {
    this.api.initialize();
    this.unsubscribe = this.context.emit.subscribe('NOTE_FIELD_FOCUSED', ({ field }) => {
      this.activeField = field;
    });
  },
  
  deactivate() {
    this.api.dispose();
    this.unsubscribe?.();
  },
};
```

**Integration Points:**
- Reads: `session.getNotes()` (to determine active field)
- Writes: `mutators.updateNote(field, transcript)` (on speech result)
- Events: Subscribes to `NOTE_FIELD_FOCUSED` to know which field to dictate into
- API: Web Speech API wrapper via `context.api.voiceApi`

**UI Component:**
```tsx
function VoiceButton({ field, isListening, onStart, onStop }) {
  return (
    <button
      onClick={isListening ? onStop : onStart}
      className={cn(
        "p-2 rounded-lg transition-colors",
        isListening ? "bg-red-50 text-red-600" : "hover:bg-[#e7d6bf]/30 text-[#2c2e4b]/60"
      )}
    >
      <Mic className={cn("h-4 w-4", isListening && "animate-pulse")} />
    </button>
  );
}
```

---

### 5.3 Clinical Decision Support

**Capability:** Display alerts, reminders, and guidelines based on patient data and current documentation.

**Plugin Registration:**
```typescript
const ClinicalDecisionSupportPlugin: CapabilityPlugin = {
  id: 'clinical-decision-support",
  version: "1.0.0",
  displayName: "Clinical Decision Support",
  dependencies: ["clinical-documentation", "patient-context"],
  permissions: ["read:notes", "read:vitals", "read:allergies"],
  
  slots: [
    {
      id: "cds-alerts",
      location: "sidebar.before-history",
      placement: "before",
      weight: 20, // high priority
      conditions: { hasAlerts: true },
    },
  ],
  
  events: [
    { type: "NOTE_UPDATED", handler: debounce(evaluateRules, 500) },
    { type: "VITALS_LOADED", handler: evaluateRules },
    { type: "OUTCOME_CHANGED", handler: evaluateRules },
  ],
  
  emits: ["CDS_ALERT_TRIGGERED", "CDS_ALERT_DISMISSED"],
  
  initialize(context) {
    this.context = context;
    this.rules = loadCDSRules(); // Clinical rules engine
  },
};
```

**Integration Points:**
- Reads: notes, vitals, allergies, conditions, outcome
- Writes: None (read-only advisory)
- Emits: `CDS_ALERT_TRIGGERED` (to show alert banner)
- UI: Conditionally renders alert cards in sidebar slot

---

### 5.4 Laboratory Orders

**Capability:** Allow doctors to order lab tests from within the consultation.

**Plugin Registration:**
```typescript
const LaboratoryOrderPlugin: CapabilityPlugin = {
  id: "laboratory-orders",
  version: "1.0.0",
  displayName: "Laboratory Orders",
  dependencies: ["clinical-documentation", "patient-context"],
  permissions: ["read:patient", "write:orders"],
  
  slots: [
    {
      id: "lab-orders",
      location: "workspace.plan.after",
      placement: "after",
      weight: 15,
    },
  ],
  
  events: [
    { type: "OUTCOME_CHANGED", handler: ({ outcome }) => {
      if (outcome === "PROCEDURE_RECOMMENDED") {
        this.showPreOpOrderSet();
      }
    }},
  ],
  
  emits: ["LAB_ORDER_CREATED", "LAB_ORDER_SENT"],
  
  initialize(context) {
    this.context = context;
    this.api = context.api.labApi;
  },
};
```

**Integration Points:**
- Reads: patient, outcome, notes (for clinical context)
- Writes: `mutators.addBillingItem(item)` / `mutators.attachDocument(type, file)`
- Events: Subscribes to `OUTCOME_CHANGED` to suggest pre-op labs
- API: `context.api.labApi.createOrder({ patientId, tests, priority })`

---

### 5.5 Imaging Requests

**Capability:** Request medical imaging and view results within the consultation.

**Plugin Registration:**
```typescript
const ImagingRequestPlugin: CapabilityPlugin = {
  id: "imaging-requests",
  version: "1.0.0",
  displayName: "Imaging Requests",
  dependencies: ["clinical-documentation", "patient-context"],
  permissions: ["read:patient", "write:orders", "read:imaging"],
  
  slots: [
    {
      id: "imaging-request",
      location: "workspace.plan.after",
      placement: "after",
      weight: 12,
    },
    {
      id: "imaging-viewer",
      location: "global.overlay",
      placement: "replace",
      weight: 0,
      conditions: { isViewing: true },
    },
  ],
  
  events: [
    { type: "CDS_ALERT_TRIGGERED", handler: ({ alert }) => {
      if (alert.code === "IMAGING_INDICATED") {
        this.showImagingOrderForm();
      }
    }},
  ],
  
  emits: ["IMAGING_ORDER_CREATED", "IMAGING_RESULT_AVAILABLE"],
  
  initialize(context) {
    this.context = context;
    this.api = context.api.imagingApi;
  },
};
```

---

### 5.6 Referral Management

**Capability:** Create and track patient referrals to other specialists.

**Plugin Registration:**
```typescript
const ReferralManagementPlugin: CapabilityPlugin = {
  id: "referral-management",
  version: "1.0.0",
  displayName: "Referral Management",
  dependencies: ["outcome-planning", "patient-context"],
  permissions: ["read:patient", "write:referrals"],
  
  slots: [
    {
      id: "referral-form",
      location: "workspace.plan.after",
      placement: "after",
      weight: 14,
    },
  ],
  
  events: [
    { type: "OUTCOME_CHANGED", handler: ({ outcome }) => {
      if (outcome === "REFERRAL_NEEDED") {
        this.showReferralForm();
      }
    }},
  ],
  
  emits: ["REFERRAL_CREATED", "REFERRAL_ACCEPTED"],
  
  initialize(context) {
    this.context = context;
    this.api = context.api.referralApi;
  },
};
```

---

### 5.7 Collaborative Consultations (Multi-Doctor)

**Capability:** Allow multiple doctors to collaborate on a consultation in real-time.

**Plugin Registration:**
```typescript
const CollaborativeConsultationPlugin: CapabilityPlugin = {
  id: "collaborative-consultation",
  version: "1.0.0",
  displayName: "Collaborative Consultation",
  dependencies: ["clinical-documentation", "session-management"],
  permissions: ["read:consultation", "write:notes", "read:presence"],
  
  slots: [
    {
      id: "presence-indicator",
      location: "header.after-actions",
      placement: "after",
      weight: 25, // very high priority
    },
    {
      id: "collaborative-cursor",
      location: "workspace.subjective.before",
      placement: "before",
      weight: 1,
    },
  ],
  
  events: [
    { type: "NOTE_UPDATED", handler: (payload) => {
      this.broadcastEdit(payload);
    }},
  ],
  
  emits: ["COLLABORATOR_JOINED", "COLLABORATOR_LEFT", "REMOTE_NOTE_UPDATE"],
  
  initialize(context) {
    this.context = context;
    this.ws = context.api.webSocketAdapter;
    this.presence = new PresenceManager(this.ws);
  },
  
  activate() {
    this.presence.join(sessionId);
    this.unsubscribe = this.context.emit.subscribe('NOTE_UPDATED', (payload) => {
      this.presence.broadcast('note_edit', payload);
    });
    this.presence.on('remote_note_edit', (payload) => {
      this.context.mutators.updateNote(payload.field, payload.value);
    });
  },
  
  deactivate() {
    this.presence.leave();
    this.unsubscribe?.();
  },
};
```

---

### 5.8 Real-Time Presence

**Capability:** Show which other doctors/nurses are viewing or editing the same consultation.

**Plugin Registration:**
```typescript
const RealTimePresencePlugin: CapabilityPlugin = {
  id: "realtime-presence",
  version: "1.0.0",
  displayName: "Real-Time Presence",
  dependencies: ["session-management"],
  permissions: ["read:presence"],
  
  slots: [
    {
      id: "presence-avatars",
      location: "header.after-actions",
      placement: "after",
      weight: 25,
    },
  ],
  
  events: [
    { type: "SESSION_STARTED", handler: ({ appointmentId }) => {
      this.announcePresence(appointmentId);
    }},
  ],
  
  emits: ["PRESENCE_UPDATED"],
  
  initialize(context) {
    this.context = context;
    this.ws = context.api.webSocketAdapter;
    this.users = new Map<string, PresenceUser>();
  },
  
  activate() {
    this.ws.subscribe('presence_update', (users) => {
      this.users = new Map(users.map(u => [u.id, u]));
      this.context.emit({ type: 'PRESENCE_UPDATED', payload: Array.from(this.users.values()) });
    });
  },
};
```

---

### 5.9 Offline Mode

**Capability:** Allow consultation access and note entry when network is unavailable.

**Plugin Registration:**
```typescript
const OfflineModePlugin: CapabilityPlugin = {
  id: "offline-mode",
  version: "1.0.0",
  displayName: "Offline Mode",
  dependencies: ["clinical-documentation", "session-management"],
  permissions: ["read:cache", "write:offline"],
  
  slots: [
    {
      id: "offline-indicator",
      location: "header.after-actions",
      placement: "after",
      weight: 30, // highest priority
      conditions: { isOffline: true },
    },
  ],
  
  events: [
    { type: "NETWORK_STATUS_CHANGED", handler: ({ isOnline }) => {
      if (isOnline) {
        this.syncPendingChanges();
      }
    }},
  ],
  
  emits: ["OFFLINE_MODE_ENTERED", "OFFLINE_MODE_EXITED", "OFFLINE_SYNCED"],
  
  initialize(context) {
    this.context = context;
    this.api = context.api;
    this.queue = new OfflineActionQueue();
  },
  
  activate() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    this.context.emit.subscribe('NOTE_UPDATED', ({ field, value }) => {
      if (!navigator.onLine) {
        this.queue.add('NOTE_UPDATE', { field, value });
      }
    });
  },
  
  deactivate() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  },
};
```

---

## 6. Extension Registration Flow

### 6.1 Manifest-Based Registration

Plugins are registered via a manifest that is loaded at app initialization:

```typescript
// extensions/manifest.ts

export const EXTENSION_MANIFEST: CapabilityPlugin[] = [
  AIClinicalAssistantPlugin,
  VoiceDictationPlugin,
  ClinicalDecisionSupportPlugin,
  LaboratoryOrderPlugin,
  ImagingRequestPlugin,
  ReferralManagementPlugin,
  CollaborativeConsultationPlugin,
  RealTimePresencePlugin,
  OfflineModePlugin,
];
```

### 6.2 Registration Sequence

```
App loads
    ↓
ExtensionRegistry instantiated
    ↓
Core providers register (Session, Documentation, Patient, Queue, Timer, Billing)
    ↓
React Query prefetches initial data
    ↓
Workflow state determined
    ↓
EXTENSION_MANIFEST iterated
    ↓
For each plugin:
  - validateDependencies (all core providers must be registered)
  - createContext (granting access to core APIs)
  - plugin.initialize(context)
  - plugin.activate()
  ↓
Plugins register their slots
    ↓
Workspace renders all registered slots
```

### 6.3 Conditional Registration

Plugins can be conditionally registered based on feature flags, user role, or license:

```typescript
export const getActiveManifest = async (): Promise<CapabilityPlugin[]> => {
  const features = await fetchFeatureFlags();
  return EXTENSION_MANIFEST.filter(plugin => {
    if (plugin.featureFlag && !features[plugin.featureFlag]) return false;
    if (plugin.requiredRole && !hasRole(plugin.requiredRole)) return false;
    return true;
  });
};
```

---

## 7. Extension Isolation Guarantees

### 7.1 Plugin Failure Does Not Crash Core

If a plugin throws during initialization or event handling, the extension registry catches the error and logs it. The core workspace continues functioning.

```typescript
// In ExtensionRegistry.emit
handlers.forEach(handler => {
  try {
    handler(event.payload);
  } catch (error) {
    console.error(`Extension ${pluginId} handler error:`, error);
    this.context.ui.showToast('A clinical assistance feature encountered an error', 'error');
  }
});
```

### 7.2 Plugin Cannot Modify Core State Directly

The ExtensionContext exposes mutators that are permission-gated:

```typescript
function createMutatorProxy(pluginId: string) {
  return {
    updateNote: (field: NoteField, value: string) => {
      if (pluginPermissions[pluginId]?.includes('write:notes')) {
        documentationDispatch({ type: 'UPDATE_NOTE', field, value });
      } else {
        throw new Error(`Plugin ${pluginId} does not have write:notes permission`);
      }
    },
    attachDocument: (type: DocumentType, file: File) => {
      if (pluginPermissions[pluginId]?.includes('write:documents')) {
        // allow
      } else {
        throw new Error(`Plugin ${pluginId} does not have write:documents permission`);
      }
    },
  };
}
```

### 7.3 Plugin Dependencies Are Explicit

A plugin cannot silently depend on another plugin. Dependencies are declared and validated:

```typescript
const AIClinicalAssistantPlugin = {
  dependencies: ['clinical-documentation', 'patient-context'],
  // If either is missing, registration fails with a clear error
};
```

### 7.4 Plugin Data Is Sandboxed

Plugins receive only the data their permissions allow:

```typescript
function createSessionProxy(pluginId: string) {
  const permissions = pluginPermissions[pluginId] ?? [];
  return {
    getAppointment: () => permissions.includes('read:appointment') ? appointment : null,
    getPatient: () => permissions.includes('read:patient') ? patient : null,
    getNotes: () => permissions.includes('read:notes') ? notes : sanitizedNotes,
  };
}
```

---

## 8. Extension Lifecycle

### 8.1 Lifecycle States

```
REGISTERED → INITIALIZING → ACTIVE → DEACTIVATING → DEACTIVATED
                  ↓
              FAILED (if initialize throws)
```

### 8.2 Lifecycle Hooks

```typescript
interface CapabilityPlugin {
  // Called once during registration
  initialize(context: ExtensionContext): void | Promise<void>;
  
  // Called after all plugins are initialized
  activate(): void | Promise<void>;
  
  // Called before deactivation
  deactivate(): void | Promise<void>;
}
```

### 8.3 Cleanup Guarantees

When a plugin is deactivated (session end, user logout, feature flag change):
- All event subscriptions are removed
- All intervals and timeouts are cleared
- All WebSocket connections are closed
- All UI slots are unmounted
- All temporary state is discarded

---

## 9. Future Capability Integration Matrix

| Future Capability | Integration Method | Slots Used | Permissions Required | Data Accessed |
|-------------------|-------------------|------------|----------------------|---------------|
| AI Clinical Assistant | Plugin | workspace.*.before/after, sidebar.before-history | read:notes, read:patient, read:history, read:vitals | Notes, patient, history, vitals |
| Voice Dictation | Plugin | workspace.*.after | write:notes | Active note field |
| Clinical Decision Support | Plugin | sidebar.before-history | read:notes, read:vitals, read:allergies | Notes, vitals, allergies, conditions |
| Laboratory Orders | Plugin | workspace.plan.after | read:patient, write:orders | Patient, outcome, notes |
| Imaging Requests | Plugin | workspace.plan.after, global.overlay | read:patient, write:orders, read:imaging | Patient, outcome |
| Referral Management | Plugin | workspace.plan.after | read:patient, write:referrals | Patient, outcome, notes |
| Collaborative Consultations | Plugin | workspace.*.before, header.after-actions | read:consultation, write:notes, read:presence | Notes, session, presence |
| Real-Time Presence | Plugin | header.after-actions | read:presence | Session, user list |
| Offline Mode | Plugin | header.after-actions | read:cache, write:offline | All data (cached) |
| Patient Education Materials | Plugin | sidebar.after-history | read:patient, read:outcome | Patient, outcome |
| Follow-up Scheduler | Plugin | workspace.plan.after | read:patient, write:appointments | Patient, outcome |
| Billing Estimator | Plugin | workspace.plan.after | read:patient, read:outcome | Patient, consultation |
| Telemedicine Integration | Plugin | global.overlay | read:appointment, write:session | Appointment, session |

---

## 10. Anti-Patterns Prevented by This Strategy

| Anti-Pattern | How Extension Strategy Prevents It |
|--------------|----------------------------------|
| Hardcoded tabs in workspace | Slots are declarative; tabs render slot content |
| Monolithic completion dialog | Extensions inject their own panels into plan.after |
| Direct console.log from plugins | Registry catches and routes errors to notification system |
| Plugin state leaking to core | Sandboxed ExtensionContext with permission gates |
| Circular plugin dependencies | Dependency validation at registration time |
| Plugin blocking core UI | Errors caught; slots render independently |
| Version conflicts between plugins | Semantic versioning in plugin manifest |
| Ghost features (unused in production) | Feature flags filter manifest at load time |

---

## 11. Summary

The extension strategy defines a **plugin architecture** where capabilities integrate through:

1. **Declarative registration** — plugins declare dependencies, permissions, and slots
2. **Extension slots** — named mount points in the UI with placement and ordering
3. **Sandboxed context** — plugins receive a permission-gated ExtensionContext
4. **Event-driven communication** — plugins communicate through the event bus
5. **Lifecycle management** — registry handles initialization, activation, deactivation, cleanup
6. **Failure isolation** — plugin errors never crash the core workspace
7. **Feature flags** — plugins can be enabled/disabled without code changes

This allows the Consultation Workspace to grow over 5–10 years by adding new plugins without modifying existing code. AI, voice, imaging, labs, referrals, collaboration, and offline mode all integrate as first-class citizens through the same extension contract.
