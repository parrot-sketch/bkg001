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
export * from './enums/PaymentStatus';
export * from './enums/PaymentMethod';
export * from './enums/Gender';
export * from './enums/Status';
export * from './enums/JobType';
export * from './enums/ConsultationRequestStatus';
export * from './enums/DoctorOnboardingStatus';

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
