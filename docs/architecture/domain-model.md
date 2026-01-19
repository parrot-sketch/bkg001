# Domain Model

**Last Updated:** January 2025

## Overview

This document describes the core domain model of the Health Information Management System (HIMS). The domain model represents the core business concepts and rules that are independent of any framework or infrastructure.

## Domain Entities

### Patient
- **Identity:** Unique patient identifier (currently Clerk userId, to be abstracted)
- **Demographics:** Name, date of birth, gender, contact information
- **Medical Information:** Blood group, allergies, medical conditions, medical history
- **Insurance:** Provider and policy number
- **Consents:** Privacy, service, and medical consents

### Appointment
- **Identity:** Unique appointment ID
- **Participants:** Patient and Doctor
- **Scheduling:** Date, time, status (PENDING, SCHEDULED, CANCELLED, COMPLETED)
- **Metadata:** Type, notes, reason for cancellation

### MedicalRecord
- **Identity:** Unique record ID
- **Context:** Links to Patient, Appointment, and Doctor
- **Clinical Data:** Treatment plan, prescriptions, lab requests
- **Sub-entities:** VitalSigns, Diagnosis, LabTest

### Doctor
- **Identity:** Unique doctor ID
- **Professional:** Name, specialization, license number, department
- **Schedule:** Working days and hours
- **Availability:** Current availability status

### Staff
- **Identity:** Unique staff ID
- **Role:** NURSE, LAB_TECHNICIAN, CASHIER
- **Status:** ACTIVE, INACTIVE, DORMANT

### Payment
- **Identity:** Unique payment ID
- **Context:** Links to Patient and Appointment
- **Financial:** Amounts, discounts, payment method, status

## Value Objects

### Email
- Immutable email address with validation
- Normalized to lowercase
- Domain and local part extraction

### PhoneNumber
- Immutable phone number with validation
- Supports international format
- Formatting for display

### Money
- Immutable monetary amount with currency
- Mathematical operations (add, subtract, multiply)
- Discount calculation support

## Domain Relationships

### One-to-Many
- Patient → Appointments
- Patient → MedicalRecords
- Patient → Payments
- Doctor → Appointments
- Appointment → MedicalRecords
- MedicalRecord → VitalSigns, Diagnosis, LabTest

### Many-to-One
- Appointment → Patient, Doctor
- MedicalRecord → Patient, Appointment, Doctor
- Payment → Patient, Appointment

## Business Rules

### Patient Rules
- Patient must have all required consents to receive care
- Patient age is calculated from date of birth
- Minors require special handling (future)

### Appointment Rules
- Appointments cannot be in the past (for new appointments)
- Appointments can only be cancelled if status is PENDING or SCHEDULED
- One MedicalRecord per Appointment (current limitation)

### Payment Rules
- Payment amounts cannot be negative
- Discounts must be between 0-100%
- Payment status determines outstanding balance

## Current Limitations

The domain model is being actively refactored. Current limitations include:

- Medical history stored as unstructured text
- No structured medication management
- No ICD-10/SNOMED coding for diagnoses
- Appointment conflicts not validated
- Limited audit capabilities

See [Layering](./layering.md) for the refactoring plan to address these limitations.
