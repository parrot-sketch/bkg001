import { IPatientRepository } from '../../domain/interfaces/repositories/IPatientRepository';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { Patient } from '../../domain/entities/Patient';
import { CreatePatientDto } from '../dtos/CreatePatientDto';
import { PatientResponseDto } from '../dtos/PatientResponseDto';
import { PatientMapper as ApplicationPatientMapper } from '../mappers/PatientMapper';
import { DomainException } from '../../domain/exceptions/DomainException';
import { PatientFileNumberGenerator, IPatientFileNumberRepository } from '../../domain/services/PatientFileNumberGenerator';

/**
 * Use Case: CreatePatientUseCase
 * 
 * Orchestrates the creation of a new patient in the healthcare system.
 * 
 * Business Purpose:
 * - Validates patient information using domain entities
 * - Ensures patient does not already exist (email uniqueness)
 * - Creates patient record
 * - Records audit event for compliance
 * 
 * Clinical Workflow:
 * This use case is part of the patient registration workflow:
 * 1. Patient registration → CreatePatientUseCase
 * 2. Appointment scheduling → ScheduleAppointmentUseCase
 * 3. Check-in → CheckInPatientUseCase
 * 
 * Rules:
 * - Patient email must be unique
 * - All consents must be provided
 * - Patient age validation handled by domain entity
 * - Audit trail required for all patient creation
 */
export class CreatePatientUseCase {
  private readonly fileNumberGenerator: PatientFileNumberGenerator;

  constructor(
    private readonly patientRepository: IPatientRepository,
    private readonly auditService: IAuditService,
  ) {
    if (!patientRepository) {
      throw new Error('PatientRepository is required');
    }
    if (!auditService) {
      throw new Error('AuditService is required');
    }

    // Initialize file number generator
    // PrismaPatientRepository implements both IPatientRepository and IPatientFileNumberRepository
    const fileNumberRepo = patientRepository as unknown as IPatientFileNumberRepository;
    this.fileNumberGenerator = new PatientFileNumberGenerator(fileNumberRepo);
  }

  /**
   * Executes the patient creation use case
   * 
   * @param dto - CreatePatientDto with patient information
   * @param userId - User ID performing the action (for audit purposes)
   * @returns Promise resolving to PatientResponseDto with created patient data
   * @throws DomainException if validation fails or patient already exists
   */
  async execute(dto: CreatePatientDto, userId: string): Promise<PatientResponseDto> {
    // Step 1: Generate system file number (NS001, NS002, etc.)
    const fileNumber = await this.fileNumberGenerator.generateNext();

    // Step 2: Map DTO to domain entity (validates business rules)
    // Note: fileNumber is generated, not from DTO
    const patient = ApplicationPatientMapper.fromCreateDto(dto, fileNumber);

    // Step 3: Check if patient with same email already exists
    const existingPatient = await this.patientRepository.findByEmail(patient.getEmail());

    if (existingPatient) {
      throw new DomainException(`Patient with email ${dto.email} already exists`, {
        email: dto.email,
      });
    }

    // Step 4: Save patient to repository
    await this.patientRepository.save(patient);

    // Step 5: Record audit event
    await this.auditService.recordEvent({
      userId,
      recordId: patient.getId(),
      action: 'CREATE',
      model: 'Patient',
      details: `Created patient: ${patient.getFullName()} (${patient.getFileNumber()}) - ${patient.getEmail().getValue()}`,
    });

    // Step 6: Map domain entity to response DTO
    return ApplicationPatientMapper.toResponseDto(patient);
  }
}
