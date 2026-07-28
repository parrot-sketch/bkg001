# Consultation Module — Capability Dependencies

## 1. Capability Dependency Graph

```
                                  ┌─────────────────────────────────────┐
                                  │   Authentication & Authorization    │
                                  │   Doctor Assignment Validation       │
                                  └──────────────────┬──────────────────┘
                                                       │
                                                       ▼
                                  ┌─────────────────────────────────────┐
                                  │    Consultation Session Management  │
                                  └──────────────────┬──────────────────┘
                                                       │
                          ┌────────────────────────────┼────────────────────────────┐
                          │                            │                            │
                          ▼                            ▼                            ▼
           ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
           │   Patient Profile Review   │ │   Clinical Documentation   │ │   Queue Management         │
           └───────────────┬───────────┘ └───────────────┬───────────┘ └───────────────┬───────────┘
                           │                            │                            │
                           │                            │                            │
                           ▼                            ▼                            ▼
           ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
           │  Consultation History      │ │  Outcome Management        │ │  Patient Switching         │
           │  Review                    │ │                           │ │                           │
           │  Previous Consultation     │ │                           │ │                           │
           │  Reference (Modal)         │ │                           │ │                           │
           └───────────────────────────┘ └───────────────┬───────────┘ └───────────────┬───────────┘
                                                       │                            │
                                                       │                            │
                                                       ▼                            │
                                          ┌───────────────────────────┐        │
                                          │  Draft Management (Auto)   │        │
                                          │  Draft Management (Manual) │        │
                                          │  Draft Restoration         │        │
                                          │  Version Conflict Recovery │        │
                                          └───────────────┬───────────┘        │
                                                          │                       │
                                                          │                       │
                                                          ▼                       │
                                          ┌───────────────────────────┐        │
                                          │  Session Heartbeat         │        │
                                          │  Timer & Session Duration  │────────┘
                                          └───────────────┬───────────┘
                                                          │
                                                          │
                                                          ▼
                                          ┌───────────────────────────┐
                                          │  Consultation Completion   │
                                          └───────────────┬───────────┘
                                                          │
                              ┌─────────────────────────────┼─────────────────────────────┐
                              │                             │                             │
                              ▼                             ▼                             ▼
               ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
               │  Billing Creation          │ │  Surgical Case Initiation │ │  Notification Dispatch     │
               └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘
                              │                             │                             │
                              │                             │                             │
                              ▼                             ▼                             ▼
                                  ┌──────────────────────────────────────────────────┐
                                  │      Queue Progression & Auto-Routing            │
                                  └──────────────────────────────────────────────────┘
                                                       │
                                                       ▼
                                          ┌───────────────────────────┐
                                          │  Error Recovery            │
                                          │  Audit & Compliance        │
                                          │  Legacy Data Migration     │
                                          └───────────────────────────┘
```

---

## 2. Core Capability Dependencies

### 2.1 Consultation Session Management
**Depends on:**
- Authentication & Authorization (JWT valid, DOCTOR role)
- Doctor Assignment Validation (doctor assigned to appointment or in queue)

**Enables:**
- Patient Profile Review
- Clinical Documentation
- Queue Management
- Timer & Session Duration Tracking

**Blocks:**
- All other capabilities except Authentication (which gates this)

---

### 2.2 Clinical Documentation
**Depends on:**
- Consultation Session Management (session must be ACTIVE)
- Patient Profile Review (context for documentation)
- Consultation History Review (context for documentation)

**Enables:**
- Outcome Management
- Draft Management (Auto-Save)
- Draft Management (Manual Save)
- Consultation Completion

**Blocks:**
- None (parallel with queue management and timer)

---

### 2.3 Patient Profile Review
**Depends on:**
- Consultation Session Management (session loaded)
- Authentication & Authorization

**Enables:**
- Clinical Documentation (informed by patient data)
- Consultation History Review (patient ID needed)

**Blocks:**
- None

---

### 2.4 Consultation History Review
**Depends on:**
- Patient Profile Review (patient ID)
- Consultation Session Management

**Enables:**
- Previous Consultation Reference (Modal)

**Blocks:**
- None

---

### 2.5 Queue Management
**Depends on:**
- Consultation Session Management
- Authentication & Authorization

**Enables:**
- Patient Switching
- Queue Progression & Auto-Routing

**Blocks:**
- None

---

### 2.6 Consultation Completion
**Depends on:**
- Clinical Documentation (notes exist)
- Outcome Management (outcome selected)
- Consultation Session Management

**Enables:**
- Billing Creation
- Surgical Case Initiation
- Notification Dispatch
- Queue Progression & Auto-Routing

**Blocks:**
- Session lifecycle (terminal state)

---

## 3. Supporting Capability Dependencies

### 3.1 Draft Management Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                      Draft Ecosystem                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Clinical Documentation                                         │
│       │                                                         │
│       ▼                                                         │
│  Draft Management (Auto-Save)                                   │
│  Draft Management (Manual Save)                                 │
│       │                                                         │
│       ├──────────────────────┐                                  │
│       │                      │                                  │
│       ▼                      ▼                                  │
│  Draft Restoration       Version Conflict Recovery              │
│  (Session Recovery)                                               │
│       │                                                         │
│       ▼                                                         │
│  Session Heartbeat (keeps session alive for saves)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Completion Cascade Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                   Completion Cascade                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Consultation Completion                                         │
│       │                                                         │
│       ├──────────────────────────────────┐                      │
│       │                                  │                      │
│       ▼                                  ▼                      │
│  Billing Creation                Surgical Case Initiation        │
│       │                                  │                      │
│       │                                  │                      │
│       ▼                                  ▼                      │
│  Notification Dispatch ◄─────────────────┘                      │
│       │                                                         │
│       ▼                                                         │
│  Queue Progression & Auto-Routing                               │
│       │                                                         │
│       ▼                                                         │
│  Patient Switching (to next patient)                            │
│       │                                                         │
│       ▼                                                         │
│  Consultation Session Management (new session)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Queue & Routing Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                    Queue & Routing Ecosystem                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Queue Management                                                │
│       │                                                         │
│       ├──────────────────┐                                      │
│       │                  │                                      │
│       ▼                  ▼                                      │
│  Patient Switching   Queue Progression & Auto-Routing           │
│       │                  │                                      │
│       │                  │                                      │
│       └────────┬─────────┘                                      │
│                ▼                                                │
│  Consultation Session Management (new session)                  │
│                │                                                │
│                ▼                                                │
│  Timer & Session Duration Tracking                              │
│                │                                                │
│                ▼                                                │
│  Session Heartbeat                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Cross-Cutting Capability Dependencies

### 4.1 Authentication & Authorization
**Depends on:** None (infrastructure capability)  
**Enables:** All other capabilities  
**Type:** Gate / Filter

### 4.2 Error Recovery
**Depends on:**
- Draft Management (for version conflict recovery)
- Consultation Session Management (for load error recovery)

**Enables:** Resilience of all capabilities  
**Type:** Safety Net

### 4.3 Audit & Compliance Logging
**Depends on:**
- Consultation Session Management (start events)
- Consultation Completion (complete events)

**Enables:** Compliance, traceability  
**Type:** Observer / Side Effect

### 4.4 Legacy Data Migration
**Depends on:**
- Consultation Session Management (session loading)

**Enables:** Clinical Documentation (structured notes available)  
**Type:** Data Transformer

---

## 5. Capability Maturity Dependencies

### 5.1 Maturity Influence Map

```
Level 1 (Basic)
├── Authentication & Authorization
├── Consultation Session Management
├── Patient Profile Review
└── Queue Management

Level 2 (Functional)
├── Clinical Documentation
├── Draft Management (Auto-Save)
├── Draft Management (Manual Save)
├── Outcome Management
└── Timer & Session Duration Tracking

Level 3 (Integrated)
├── Draft Restoration (Session Recovery)
├── Version Conflict Recovery
├── Session Heartbeat
├── Consultation History Review
├── Previous Consultation Reference (Modal)
└── Patient Switching

Level 4 (Reusable)
├── Consultation Completion
├── Billing Creation
├── Notification Dispatch
└── Audit & Compliance Logging

Level 5 (Platform Ready)
├── Surgical Case Initiation
├── Queue Progression & Auto-Routing
├── Error Recovery (comprehensive)
└── Legacy Data Migration
```

### 5.2 Dependency on Maturity

Higher-maturity capabilities depend on lower-maturity capabilities being stable:

- **Level 2** capabilities require **Level 1** to be functional
- **Level 3** capabilities require **Level 2** to be reliable
- **Level 4** capabilities require **Level 3** to be robust
- **Level 5** capabilities require **Level 4** to be production-ready

---

## 6. Ownership Boundaries

### 6.1 Presentation Layer Ownership
- Consultation Session Management
- Clinical Documentation
- Patient Profile Review
- Consultation History Review
- Previous Consultation Reference (Modal)
- Queue Management
- Patient Switching
- Timer & Session Duration Tracking
- Error Recovery (Load Failure UI)

### 6.2 Application Layer Ownership
- Consultation Completion
- Billing Creation
- Surgical Case Initiation
- Notification Dispatch
- Audit & Compliance Logging

### 6.3 Domain Layer Ownership
- Outcome Management (business rules)
- Draft Management (version safety)
- Version Conflict Recovery (business rules)
- Doctor Assignment Validation (business rules)

### 6.4 Infrastructure Layer Ownership
- Authentication & Authorization
- Session Heartbeat
- Queue Progression & Auto-Routing (orchestration)
- Error Recovery (load failure)
- Legacy Data Migration

### 6.5 Shared Ownership
- Draft Management (Auto-Save) — Presentation (debounce) + Application (mutation) + Infrastructure (API)
- Draft Restoration — Presentation (localStorage) + Application (hydration)
- Consultation Session Management — Presentation (UI) + Application (use case) + Infrastructure (API)

---

## 7. Summary

The Consultation Module's capabilities form a hierarchy where:

1. **Authentication & Authorization** is the foundational gate
2. **Consultation Session Management** is the core enabler
3. **Clinical Documentation** is the primary value-adding activity
4. **Draft Management** (auto + manual + restoration) provides data integrity
5. **Patient Profile & History Review** provides clinical context
6. **Queue Management** provides workflow continuity
7. **Outcome Management** drives downstream business processes
8. **Consultation Completion** is the terminal capability that triggers administrative workflows
9. **Billing, Surgical Case, Notifications** are the business outcomes
10. **Error Recovery** and **Audit** provide resilience and compliance

No capability is truly independent. The module functions as an integrated system where the output of one capability becomes the input to another.
