
import { Patient } from '../domain/entities/Patient';
import { Gender } from '../domain/enums/Gender';
import { Email } from '../domain/value-objects/Email';
import { PhoneNumber } from '../domain/value-objects/PhoneNumber';

try {
    console.log('Testing Patient creation with old DOB...');

    // Date from 1800 (226 years ago)
    const oldDate = new Date('1800-01-01');

    const patient = Patient.create({
        id: 'test-id',
        fileNumber: 'TEST001',
        firstName: 'Old',
        lastName: 'Timer',
        dateOfBirth: oldDate,
        gender: Gender.MALE,
        email: 'old@example.com',
        phone: '+254700000000',
        address: 'History Lane',
        maritalStatus: 'Widowed',
        emergencyContactName: 'Grandchild',
        emergencyContactNumber: '+254700000000',
        relation: 'Kin',
        privacyConsent: true,
        serviceConsent: true,
        medicalConsent: true,
    });

    console.log('✅ Patient created successfully!');
    console.log(`DOB: ${patient.getDateOfBirth().toISOString()}`);
    console.log(`Age: ${patient.getAge()} years`);

} catch (error) {
    console.error('❌ Failed to create patient:', error);
    process.exit(1);
}
