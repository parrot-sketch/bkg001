import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateDoctorProfileUseCase } from '../../../application/use-cases/UpdateDoctorProfileUseCase';
import { IDoctorRepository } from '../../../domain/interfaces/repositories/IDoctorRepository';
import { IAuditService } from '../../../domain/interfaces/services/IAuditService';
import { DomainException } from '../../../domain/exceptions/DomainException';
import { UpdateDoctorProfileDto } from '../../../application/dtos/UpdateDoctorProfileDto';

describe('UpdateDoctorProfileUseCase', () => {
    let useCase: UpdateDoctorProfileUseCase;
    let mockDoctorRepository: IDoctorRepository;
    let mockAuditService: IAuditService;

    const mockDoctor = {
        id: 'doc-123',
        user_id: 'user-123',
        email: 'doc@test.com',
        first_name: 'John',
        last_name: 'Doe',
        name: 'Dr. John Doe',
        specialization: 'Cardiology',
        license_number: 'LIC-123',
        bio: 'Old bio',
        created_at: new Date(),
        updated_at: new Date(),
    };

    beforeEach(() => {
        mockDoctorRepository = {
            findById: vi.fn(),
            findByUserId: vi.fn(),
            update: vi.fn(),
            isLicenseUnique: vi.fn(),
        };
        mockAuditService = {
            recordEvent: vi.fn(),
        };
        useCase = new UpdateDoctorProfileUseCase(mockDoctorRepository, mockAuditService);
    });

    it('should update doctor profile successfully', async () => {
        const dto: UpdateDoctorProfileDto = {
            doctorId: 'doc-123',
            bio: 'New bio',
            education: 'PhD',
        };

        const updatedDoctor = { ...mockDoctor, bio: 'New bio', education: 'PhD' };

        vi.mocked(mockDoctorRepository.findById).mockResolvedValue(mockDoctor as any);
        vi.mocked(mockDoctorRepository.update).mockResolvedValue(updatedDoctor as any);

        const result = await useCase.execute(dto);

        expect(result).toBeDefined();
        expect(result.bio).toBe('New bio');
        expect(result.education).toBe('PhD');

        expect(mockDoctorRepository.findById).toHaveBeenCalledWith('doc-123');
        expect(mockDoctorRepository.update).toHaveBeenCalledWith('doc-123', expect.objectContaining({
            bio: 'New bio',
            education: 'PhD',
        }));
        expect(mockAuditService.recordEvent).toHaveBeenCalled();
    });

    it('should throw DomainException if doctor does not exist', async () => {
        vi.mocked(mockDoctorRepository.findById).mockResolvedValue(null);

        const dto: UpdateDoctorProfileDto = { doctorId: 'unknown-doc' };

        await expect(useCase.execute(dto))
            .rejects
            .toThrow(DomainException);

        expect(mockDoctorRepository.update).not.toHaveBeenCalled();
        expect(mockAuditService.recordEvent).not.toHaveBeenCalled();
    });
});
