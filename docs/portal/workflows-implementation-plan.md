# Portal Workflows Implementation Plan

## Status Summary

### ✅ Completed
1. **Complete Profile** (`/portal/profile`)
   - Basic profile form (optional fields)
   - Progressive identity building (not medical intake)
   - Mobile-optimized UI

### 🚧 In Progress
2. **Book Consultation** (`/portal/consultation/start`)
   - Needs: Step-by-step flow component
   - Needs: ConsultationIntent model or Appointment with PENDING status
   - Needs: Service selection UI

### 📋 To Do
3. **Meet Our Doctors** (`/portal/doctors`)
   - Display surgeon profiles
   - Filter by specialty
   - View full profile
   - "Request consultation" CTA

4. **Learn More** (`/portal/learn`)
   - Education hub
   - Procedures info
   - What to expect
   - Recovery guides
   - Safety info
   - FAQs

## Next Steps

1. Create ConsultationIntent domain model (or use Appointment.PENDING)
2. Implement step-by-step consultation booking flow
3. Create doctors listing page with filtering
4. Create education hub with real Nairobi Sculpt content

## Architecture Notes

- Use existing Appointment model with PENDING status for consultation requests
- No new domain models needed immediately - can use existing Appointment.PENDING
- Reuse existing DoctorProfileModal for doctor details
- Extract real content from nairobisculpt.com for education hub
