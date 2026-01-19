/**
 * Domain Layer - Public API
 * 
 * This file exports all public domain types, entities, value objects, and enums.
 * This allows consumers to import from '@domain' instead of deep paths.
 * 
 * Following Clean Architecture principles, this layer has ZERO dependencies
 * on frameworks, infrastructure, or other layers.
 */

// Enums
export * from './enums/Role';
export * from './enums/AppointmentStatus';
export * from './enums/ConsultationState';
export * from './enums/ConsultationOutcomeType';
export * from './enums/NoShowReason';
export * from './enums/PatientDecision';
export * from './enums/PaymentStatus';
export * from './enums/PaymentMethod';
export * from './enums/Gender';
export * from './enums/Status';
export * from './enums/JobType';
export * from './enums/ConsultationRequestStatus';
export * from './enums/DoctorOnboardingStatus';
export * from './enums/ConsultUrgency';
export * from './enums/ConsultStatus';
export * from './enums/ImageTimepoint';
export * from './enums/ImageAngle';
export * from './enums/CaseReadinessStatus';
export * from './enums/TaskPriority';
export * from './enums/TaskStatus';
export * from './enums/OutcomeStatus';

// Entities
export * from './entities/Consultation';

// Value Objects
export * from './value-objects/CheckInInfo';
export * from './value-objects/NoShowInfo';
export * from './value-objects/ConsultationDuration';
export * from './value-objects/ConsultationNotes';

// Exceptions
export * from './exceptions/DomainException';

// Value Objects
export * from './value-objects/Email';
export * from './value-objects/PhoneNumber';
export * from './value-objects/Money';

// Entities
export * from './entities/Patient';
export * from './entities/Appointment';

// Repository Interfaces
export * from './interfaces/repositories/IPatientRepository';
export * from './interfaces/repositories/IAppointmentRepository';

// Service Interfaces
export * from './interfaces/services/INotificationService';
export * from './interfaces/services/IAuditService';
export * from './interfaces/services/ITimeService';
