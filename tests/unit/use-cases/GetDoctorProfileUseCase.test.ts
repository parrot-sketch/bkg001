import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetDoctorProfileUseCase } from '../../../application/use-cases/GetDoctorProfileUseCase';
import { IDoctorRepository } from '../../../domain/interfaces/repositories/IDoctorRepository';
import { DomainException } from '../../../domain/exceptions/DomainException';

describe('GetDoctorProfileUseCase', () => {
    let useCase: GetDoctorProfileUseCase;
    let mockDoctorRepository: IDoctorRepository;

    const mockDoctor = {
        id: 'doc-123',
        user_id: 'user-123',
        email: 'doc@test.com',
        first_name: 'John',
        last_name: 'Doe',
        name: 'Dr. John Doe',
        specialization: 'Cardiology',
        license_number: 'LIC-123',
        phone: '555-0123',
        address: '123 Medical Way',
        created_at: new Date(),
        updated_at: new Date(),
    };

    beforeEach(() => {
        mockDoctorRepository = {
            findById: vi.fn(),
            findByUserId: vi.fn(),
            findBySlug: vi.fn(),
            update: vi.fn(),
            isLicenseUnique: vi.fn(),
        };
        useCase = new GetDoctorProfileUseCase(mockDoctorRepository);
    });

    describe('executeByUserId', () => {
        it('should return doctor profile when found', async () => {
            vi.mocked(mockDoctorRepository.findByUserId).mockResolvedValue(mockDoctor as any);

            const result = await useCase.executeByUserId('user-123');

            expect(result).toBeDefined();
            expect(result.id).toBe('doc-123');
            expect(result.userId).toBe('user-123');
            expect(mockDoctorRepository.findByUserId).toHaveBeenCalledWith('user-123');
        });

        it('should throw DomainException when not found', async () => {
            vi.mocked(mockDoctorRepository.findByUserId).mockResolvedValue(null);

            await expect(useCase.executeByUserId('unknown-user'))
                .rejects
                .toThrow(DomainException);
        });
    });

    describe('executeByDoctorId', () => {
        it('should return doctor profile when found', async () => {
            vi.mocked(mockDoctorRepository.findById).mockResolvedValue(mockDoctor as any);

            const result = await useCase.executeByDoctorId('doc-123');

            expect(result).toBeDefined();
            expect(result.id).toBe('doc-123');
            expect(mockDoctorRepository.findById).toHaveBeenCalledWith('doc-123');
        });

        it('should throw DomainException when not found', async () => {
            vi.mocked(mockDoctorRepository.findById).mockResolvedValue(null);

            await expect(useCase.executeByDoctorId('unknown-doc'))
                .rejects
                .toThrow(DomainException);
        });
    });
});
