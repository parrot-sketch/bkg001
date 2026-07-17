# Architecture Documentation

**Purpose:** This directory contains the authoritative architecture documentation for the Nairobi Sculpt Hospital Management System. These documents are the single source of truth for the platform's design decisions, business rules, and future direction.

**Audience:** Engineers, architects, product managers, and future AI coding models.

---

## Directory Structure

```
architecture/
├── 00-principles/
│   ├── architecture-principles.md          # 12 immutable architectural principles
│   ├── ubiquitous-language.md              # Canonical vocabulary of the system
│   ├── context-map.md                      # Bounded contexts and relationships
│   ├── aggregate-diagrams.md               # Aggregate roots and their invariants
│   └── event-design-rules.md               # Rules for event design and naming
│
├── 01-current-state/
│   ├── patient-intake.md                   # Patient Intake — Current State Audit
│   ├── appointments.md                     # Appointment Management — Current State Audit
│   ├── queue.md                            # Queue Management — Current State Audit
│   ├── consultation.md                     # Consultation — Current State Audit
│   ├── billing.md                          # Billing & Payments — Current State Audit
│   ├── surgical.md                         # Surgical Management — Current State Audit
│   ├── clinical.md                         # Clinical Documentation — Current State Audit
│   └── inventory.md                        # Inventory & Procurement — Current State Audit
│
├── 02-event-catalog/
│   ├── domain-capability-map.md            # Document F — Capability to Event mapping
│   ├── event-catalog.md                    # 80+ events classified by category and tier
│   ├── event-ownership.md                  # Who owns each event (source of truth)
│   └── event-envelope.md                   # Standardized event envelope definition
│
├── 03-workflows/
│   ├── patient-intake.md                   # Patient Intake — Business Process
│   ├── appointment.md                      # Appointment — Business Process
│   ├── queue.md                            # Queue Management — Business Process
│   ├── consultation.md                     # Consultation — Business Process
│   ├── billing.md                          # Billing — Business Process
│   ├── surgical.md                         # Surgical — Business Process
│   └── inventory.md                        # Inventory — Business Process
│
├── 04-agent-platform/
│   ├── agent-responsibility-matrix.md      # Agent boundaries and permissions
│   ├── agent-catalog.md                    # Complete agent inventory
│   └── orchestration.md                    # How agents coordinate via events
│
└── 05-roadmap/
    ├── roadmap.md                          # Phase 0-6 roadmap
    ├── phase-1-event-infrastructure.md     # Outbox, event bus, replace polling
    ├── phase-2-domain-event-design.md      # Event schema and contracts
    ├── phase-3-workflow-engine.md          # Workflow engine implementation
    ├── phase-4-agents.md                   # Rule-based and assisted agents
    └── phase-5-llm-agents.md              # LLM-powered agents
```

---

## Document Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                     Architecture Documents                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  00-principles                                              │
│  ├── architecture-principles.md                             │
│  ├── ubiquitous-language.md                                 │
│  ├── context-map.md                                         │
│  ├── aggregate-diagrams.md                                  │
│  └── event-design-rules.md                                  │
│       │                                                     │
│       ▼                                                     │
│  01-current-state                                           │
│  └── [domain].md                                            │
│       │                                                     │
│       ▼                                                     │
│  02-event-catalog                                           │
│  ├── domain-capability-map.md                               │
│  ├── event-catalog.md                                       │
│  ├── event-ownership.md                                     │
│  └── event-envelope.md                                      │
│       │                                                     │
│       ▼                                                     │
│  03-workflows                                               │
│  └── [domain].md                                            │
│       │                                                     │
│       ▼                                                     │
│  04-agent-platform                                          │
│  └── agent-responsibility-matrix.md                         │
│       │                                                     │
│       ▼                                                     │
│  05-roadmap                                                 │
│  └── roadmap.md                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Reading Order

### For New Engineers
1. `00-principles/architecture-principles.md` — Understand the "why"
2. `00-principles/ubiquitous-language.md` — Learn the vocabulary
3. `00-principles/context-map.md` — Understand module boundaries
4. `01-current-state/patient-intake.md` — Understand one workflow completely
5. `03-workflows/patient-intake.md` — Understand the business process
6. `02-event-catalog/event-catalog.md` — Understand the event stream

### For Architects
1. `00-principles/architecture-principles.md`
2. `00-principles/context-map.md`
3. `00-principles/aggregate-diagrams.md`
4. `02-event-catalog/domain-capability-map.md`
5. `02-event-catalog/event-ownership.md`
6. `04-agent-platform/agent-responsibility-matrix.md`

### For Product Managers
1. `00-principles/ubiquitous-language.md`
2. `03-workflows/patient-intake.md`
3. `01-current-state/patient-intake.md` (Executive Summary)
4. `04-agent-platform/agent-responsibility-matrix.md` (Agent Opportunities)

### For AI/Agent Developers
1. `02-event-catalog/event-envelope.md`
2. `02-event-catalog/event-ownership.md`
3. `04-agent-platform/agent-responsibility-matrix.md`
4. `00-principles/aggregate-diagrams.md`

---

## Document Status

| Document | Status | Last Updated | Owner |
|----------|--------|--------------|-------|
| Architecture Principles | Approved | 2026-07-09 | Architecture Team |
| Ubiquitous Language | Approved | 2026-07-09 | Architecture Team |
| Context Map | Approved | 2026-07-09 | Architecture Team |
| Aggregate Diagrams | Approved | 2026-07-09 | Architecture Team |
| Event Design Rules | Approved | 2026-07-09 | Architecture Team |
| Domain Capability Map | Draft | 2026-07-09 | Architecture Team |
| Event Catalog | Draft | 2026-07-09 | Architecture Team |
| Event Ownership | Draft | 2026-07-09 | Architecture Team |
| Event Envelope | Draft | 2026-07-09 | Architecture Team |
| Agent Responsibility Matrix | Draft | 2026-07-09 | Architecture Team |
| Roadmap | Draft | 2026-07-09 | Product + Architecture |
| Patient Intake — Current State | Complete | 2026-07-09 | Engineering |
| Patient Intake — Workflow | Complete | 2026-07-09 | Product + Engineering |
| Appointments — Current State | Not Started | — | Engineering |
| Queue — Current State | Not Started | — | Engineering |
| Consultation — Current State | Not Started | — | Engineering |
| Billing — Current State | Not Started | — | Engineering |
| Surgical — Current State | Not Started | — | Engineering |
| Clinical — Current State | Not Started | — | Engineering |
| Inventory — Current State | Not Started | — | Engineering |

---

## Next Steps

1. Review all Phase 0 documents with stakeholders
2. Approve architecture principles and ubiquitous language
3. Begin Phase 1: Domain Discovery for remaining modules
4. Finalize event catalog with domain experts
5. Begin Phase 2: Event Design
6. Begin Phase 3: Event Infrastructure implementation
