# Complete Workflow Testing Guide

## 🎯 Overview

This guide provides comprehensive test data and step-by-step instructions for showcasing the **complete patient consultation workflow** from booking through case planning. All test data is for **TODAY** to make testing immediate and realistic.

---

## 📊 Test Data Summary

### **TODAY's Appointments (9 Total)**

The seed has created **9 appointments for TODAY** at different workflow stages:

| Time | Patient | Status | Doctor | Purpose |
|------|---------|--------|--------|---------|
| **08:00** | Daniel Mutua | COMPLETED ✅ | Dr. Dorsi Jowi | Consultation finished, surgery scheduled |
| **09:00** | Sarah Kimani | PENDING ⏳ | Dr. Dorsi Jowi | Waiting for check-in |
| **09:30** | James Odhiambo | SCHEDULED ✓ | Dr. Mukami Gathariki | Checked in, ready for doctor |
| **10:00** | Grace Wanjiru | IN_PROGRESS 🏥 | Dr. John Paul Ogalo | Active consultation |
| **10:30** | Test Patient | SCHEDULED ✓ | Dr. Dorsi Jowi | Ready for doctor |
| **11:00** | Millicent Muchiri | PENDING ⏳ | Dr. Dorsi Jowi | Waiting for check-in |
| **11:30** | Rhoda Atieno | SCHEDULED ✓ | Dr. John Paul Ogalo | Checked in, ready for doctor |
| **14:00** | Mary Njeri | PENDING ⏳ | Dr. Mukami Gathariki | Afternoon appointment |
| **15:00** | Sandra Nyakiongora | PENDING ⏳ | Dr. Mukami Gathariki | Afternoon appointment |
| **16:00** | Amina Hassan | PENDING ⏳ | Dr. Dorsi Jowi | Late afternoon appointment |

---

## 🔐 Test Credentials

```
Admin:
  Email: admin@nairobisculpt.com
  Password: admin123

Frontdesk:
  Email: receptionist@nairobisculpt.com
  Password: frontdesk123

Nurses:
  Email: jane.wambui@nairobisculpt.com
  Password: nurse123

Doctors:
  Email: dorsi.jowi@nairobisculpt.com
  Password: doctor123

Patients:
  Email: sarah.arrival@test.com
  Password: patient123
```

---

## 🎬 Complete Workflow Demonstration

### **Stage 1: Patient View - Booked Appointment** ✅

**Login as Patient:** `sarah.arrival@test.com` / `patient123`

**Patient:** Sarah Kimani (TEST101)

1. Navigate to `/patient/appointments`
2. You should see an appointment for **TODAY at 09:00**
3. **Status:** PENDING (Waiting for check-in)
4. **Type:** Initial Consultation - Breast Augmentation

**What to Show:**
- ✅ Patient can see their booked appointment
- ✅ Status badge shows "PENDING"
- ✅ Appointment details are clear
- ✅ Patient dashboard is clean and functional

**Patient Profile:**
- File Number: TEST101
- Age: 33 years old
- Medical History: Interested in breast augmentation
- Allergies: Penicillin (mild reaction)
- Blood Group: A+

---

### **Stage 2: Frontdesk - Check-In Process** 🏥

**Login as Frontdesk:** `receptionist@nairobisculpt.com` / `frontdesk123`

#### **2A: View Today's Appointments**

1. Navigate to `/frontdesk/appointments`
2. Dashboard shows:
   - **Pending Check-ins:** 5 patients
   - **Checked In:** 2 patients
   - **Completed:** 1 consultation

#### **2B: Check In a Patient**

**Target Patient:** Sarah Kimani (09:00)

1. Find Sarah Kimani's appointment (09:00)
2. Click **"Check In"** button
3. Confirm check-in in dialog
4. ✅ Success: "Patient checked in successfully"
5. **Status changes:** PENDING → SCHEDULED
6. **Dashboard updates:** Pending count decreases

**What to Show:**
- ✅ Frontdesk can easily find patients
- ✅ Check-in process is simple
- ✅ Real-time status updates
- ✅ Dashboard metrics update automatically

#### **2C: View Checked-In Patients**

Patients ready for doctor (SCHEDULED status):
- **09:30** - James Odhiambo (already checked in)
- **10:30** - Test Patient (already checked in)
- **11:30** - Rhoda Atieno (already checked in)

---

### **Stage 3: Nurse - Patient Preparation** 🩺

**Login as Nurse:** `jane.wambui@nairobisculpt.com` / `nurse123`

#### **3A: View Assigned Patients**

1. Navigate to `/nurse/dashboard`
2. View patients assigned for today
3. See Sarah Kimani and other workflow patients

#### **3B: Record Vital Signs** (Example: James Odhiambo)

**Patient:** James Odhiambo (09:30, already has vitals)

View recorded vitals:
- Temperature: 36.8°C
- Blood Pressure: 118/76 mmHg
- Heart Rate: 68-74 bpm
- O2 Saturation: 99%
- Weight: 78.2 kg
- Height: 175 cm

**What to Show:**
- ✅ Nurses can record patient vitals
- ✅ Vitals are immediately available to doctors
- ✅ Care notes can be added
- ✅ Pre-operative assessments tracked

---

### **Stage 4: Doctor - View Appointments** 👨‍⚕️

**Login as Doctor:** `dorsi.jowi@nairobisculpt.com` / `doctor123`

#### **4A: Doctor's Appointments Page**

1. Navigate to `/doctor/appointments`
2. View appointments for today

**Dr. Dorsi Jowi's Schedule:**
- ✅ **08:00** - Daniel Mutua (COMPLETED)
- ✅ **09:00** - Sarah Kimani (SCHEDULED - just checked in!)
- ✅ **10:30** - Test Patient (SCHEDULED)
- ⏳ **11:00** - Millicent Muchiri (PENDING)
- ⏳ **16:00** - Amina Hassan (PENDING)

**What to Show:**
- ✅ Doctor sees all checked-in patients
- ✅ Clear appointment cards with patient info
- ✅ "Begin Consultation" button for SCHEDULED patients
- ✅ Patient profiles easily accessible

---

### **Stage 5: Active Consultation - IN_PROGRESS** 🏥

**Login as Doctor:** `john.ogalo@nairobisculpt.com` / `doctor123`

#### **5A: View Active Consultation**

**Patient:** Grace Wanjiru (10:00) - Currently IN_PROGRESS

1. Navigate to `/doctor/consultations`
2. See Grace Wanjiru's consultation as **IN PROGRESS**
3. Click **"Continue"** button
4. Redirected to `/doctor/consultations/{id}/session`

#### **5B: Consultation Workspace**

**Full Consultation Interface:**

**Left Panel - Patient Info:**
- Name: Grace Wanjiru (TEST103)
- Age: 37 years old
- File Number: TEST103
- Occupation: Lawyer
- Medical History: Interested in rhinoplasty
- Allergies: Latex (mild)
- Blood Group: B+

**Vitals (Already Recorded):**
- Temperature: 36.5°C
- BP: 115/75 mmHg
- Heart Rate: 70-76 bpm
- O2 Saturation: 98%
- Weight: 62.0 kg
- Height: 168 cm

**Main Workspace Tabs:**
1. **Overview** - Patient summary
2. **Clinical Notes** - Structured note-taking
3. **Examination** - Physical examination findings
4. **Images** - Patient photos
5. **History** - Past consultations

**Right Panel - Structured Notes:**
- Chief Complaint
- History of Present Illness
- Assessment
- Plan
- **Outcome Type:** (Dropdown)
  - Treatment Plan Provided
  - Surgery Recommended ✓
  - Referral Made
  - Follow-up Scheduled
  - No Treatment Required
- **Patient Decision:** (Dropdown)
  - Accepted
  - Declined
  - Needs time to decide

**Quick Actions:**
- 👤 **"View Full Profile"** - Navigate to patient profile
- 📋 **"Add Vital Signs"**
- 🎯 **"Cases & Procedures"**
- 💾 **"Save Notes"**
- ✅ **"Complete Consultation"**

**What to Show:**
- ✅ Comprehensive consultation workspace
- ✅ Structured note-taking
- ✅ Easy access to patient history
- ✅ Real-time auto-save
- ✅ Seamless navigation to patient profile

---

### **Stage 6: Begin New Consultation** 🚀

**Continue as Doctor:** Dr. Dorsi Jowi

#### **6A: Start Consultation with Sarah Kimani**

1. From `/doctor/appointments`
2. Find Sarah Kimani (09:00 - SCHEDULED)
3. Click **"Begin Consultation"** button

#### **6B: Start Consultation Dialog**

**Dialog Shows:**
- Patient name and details
- Safety information/alerts
- **Pre-Consultation Notes field** (optional)
  - Placeholder: "Enter any preliminary observations or notes before starting the consultation"

Example pre-consultation note:
```
Patient arrived on time. Appears healthy and well-prepared. 
Has brought reference photos for breast augmentation. 
Medical history reviewed - no contraindications noted.
```

4. Click **"Begin Consultation"**
5. ✅ Redirected to consultation session

#### **6C: Complete the Consultation**

**Fill out structured notes:**

```markdown
Chief Complaint:
Interested in breast augmentation. Patient desires natural-looking enhancement.

History of Present Illness:
33-year-old female seeking breast augmentation consultation. 
No previous breast surgery. Generally healthy with no significant medical history.
Patient has researched procedure and has realistic expectations.

Assessment:
Good candidate for breast augmentation. Discussed implant options:
- Silicone vs saline
- Implant size and profile
- Incision placement (inframammary vs periareolar)
- Implant positioning (submuscular vs subglandular)

Plan:
1. Schedule surgery for breast augmentation
2. Pre-operative assessment required
3. Lab work: CBC, metabolic panel
4. Medical clearance if over 40 or with medical history
5. Review informed consent
6. Discuss post-operative care and expectations
```

**Select Outcome:** Surgery Recommended

**Patient Decision:** Accepted

#### **6D: Complete Consultation**

1. Click **"Complete Consultation"**
2. **Complete Consultation Dialog** appears

**Dialog Options:**
- Consultation summary (auto-populated)
- **Schedule Follow-up:**
  - Date picker
  - Time slot selector
  - Appointment type
- Final notes confirmation

**Schedule Follow-up:**
- Date: 1 week from today
- Time: 09:00
- Type: Pre-operative Assessment

3. Click **"Complete"**
4. ✅ Status: COMPLETED
5. ✅ Follow-up appointment created (PENDING)
6. ✅ Redirected to appointments page

**What to Show:**
- ✅ Complete consultation workflow
- ✅ Structured clinical documentation
- ✅ Easy follow-up scheduling
- ✅ Status transitions
- ✅ Patient continuity of care

---

### **Stage 7: View Completed Consultation** ✅

**Stay logged in as Doctor:** Dr. Dorsi Jowi

#### **7A: Doctor's View**

1. Navigate to `/doctor/consultations`
2. View **completed consultations**
3. See Daniel Mutua (08:00 - COMPLETED)

**Daniel Mutua's Consultation:**
- Completed: Today at 08:50
- Duration: 45 minutes
- **Outcome:** Surgery recommended and scheduled
- **Type:** Gynecomastia Surgery
- **Status:** Case plan created (READY)

Actions:
- **"View Profile"** - See full patient history
- **"View Case Plan"** - Review surgical plan

#### **7B: Patient Profile with Cases & Procedures**

1. Click **"View Profile"** on Daniel Mutua
2. Navigate to `/doctor/patients/{id}`

**Profile Tabs:**
- **Overview** - Demographics, vitals, allergies
- **Clinical History** - All consultations
- **Cases & Procedures** - Surgical cases ⭐
- **Timeline** - Chronological journey

3. Click **"Cases & Procedures"** tab

**Case Plan Details:**

```
Procedure: Gynecomastia Surgery
Status: READY ✅
Surgery Date: [Next week]

Procedure Plan:
Bilateral subcutaneous mastectomy with liposuction. 
Periareolar approach. Removal of glandular tissue and excess fat.

Risk Factors:
- No significant medical history
- Previous tummy tuck - healed well
- Non-smoker
- Excellent surgical candidate

Pre-Operative Notes:
Pre-operative assessment completed. Labs normal. EKG normal. 
Patient fully informed of risks/benefits. Consent signed.

Planned Anesthesia:
General anesthesia

Special Instructions:
Mark surgical sites. Compression garment prepared. 
Post-op care instructions provided.

Ready for Surgery: YES ✅
```

**What to Show:**
- ✅ Complete consultation history
- ✅ Surgical case planning
- ✅ Case readiness tracking
- ✅ Comprehensive patient records
- ✅ Pre-operative assessments

---

### **Stage 8: Patient Post-Consultation View** 🎉

**Login as Patient:** `daniel.completed@test.com` / `patient123`

#### **8A: View Completed Consultation**

1. Navigate to `/patient/appointments`
2. See appointment with status: **COMPLETED** ✅

**Appointment Shows:**
- Date: Today at 08:00
- Doctor: Dr. Dorsi Jowi
- Type: Initial Consultation - Gynecomastia
- Status: COMPLETED

#### **8B: View Upcoming Surgery**

**Follow-up Appointment:**
- Date: [Next week]
- Time: 08:00
- Type: Gynecomastia Surgery
- Status: SCHEDULED

**What to Show:**
- ✅ Patient sees completed consultation
- ✅ Patient sees scheduled surgery
- ✅ Clear status indicators
- ✅ Patient journey is tracked

---

## 🎯 Quick Test Scenarios

### **Scenario A: Complete Fresh Workflow (15 minutes)**

1. **Patient Books** → `sarah.arrival@test.com`
   - View TODAY's 09:00 appointment

2. **Frontdesk Checks In** → `receptionist@nairobisculpt.com`
   - Check in Sarah Kimani
   - View dashboard updates

3. **Nurse Records Vitals** → `jane.wambui@nairobisculpt.com`
   - Add vitals for Sarah
   - Add care notes

4. **Doctor Begins Consultation** → `dorsi.jowi@nairobisculpt.com`
   - Start consultation with Sarah
   - Fill structured notes
   - Complete consultation
   - Schedule follow-up

5. **View Results**
   - Patient sees COMPLETED status
   - Follow-up appointment created

---

### **Scenario B: View Active Consultation (5 minutes)**

**Demonstrate Active Consultation:**

1. Login as `john.ogalo@nairobisculpt.com`
2. Navigate to `/doctor/consultations`
3. See **Grace Wanjiru - IN PROGRESS**
4. Click "Continue"
5. Show consultation workspace
6. Demonstrate:
   - Structured notes
   - Patient history
   - Quick actions
   - Profile navigation
   - Save functionality

---

### **Scenario C: Case Planning Workflow (5 minutes)**

**Demonstrate Surgical Case Planning:**

1. Login as `dorsi.jowi@nairobisculpt.com`
2. Navigate to `/doctor/consultations`
3. Find **Daniel Mutua - COMPLETED**
4. Click "View Profile"
5. Click "Cases & Procedures" tab
6. Show case plan details:
   - Procedure plan
   - Risk factors
   - Pre-op notes
   - Readiness status (READY ✅)

---

## 📋 Testing Checklist

### **Patient Features:**
- [ ] View booked appointments
- [ ] See appointment status (PENDING, SCHEDULED, COMPLETED)
- [ ] View appointment details
- [ ] See follow-up appointments
- [ ] View completed consultation history

### **Frontdesk Features:**
- [ ] View today's appointments
- [ ] Dashboard metrics (pending, checked in, completed)
- [ ] Check in patients (PENDING → SCHEDULED)
- [ ] Search/filter appointments
- [ ] Real-time status updates

### **Nurse Features:**
- [ ] View assigned patients
- [ ] Record vital signs
- [ ] Add care notes (pre-op, post-op)
- [ ] Support consultation prep
- [ ] Vitals visible to doctors

### **Doctor Features:**
- [ ] View appointments (filtered by status)
- [ ] Begin consultation (SCHEDULED → IN_PROGRESS)
- [ ] Structured note-taking interface
- [ ] View patient full profile during consultation
- [ ] Complete consultation (IN_PROGRESS → COMPLETED)
- [ ] Schedule follow-up appointments
- [ ] View consultation history
- [ ] Create/manage case plans
- [ ] Track case readiness

### **Navigation & UX:**
- [ ] Context-aware navigation (Back to Consultation)
- [ ] Smooth transitions between pages
- [ ] Clear status indicators
- [ ] Real-time updates
- [ ] Toast notifications
- [ ] Loading states
- [ ] Error handling

---

## 🐛 Known Features & Enhancements

### **✅ Recently Fixed:**
- Slot availability showing booked slots
- Time format mismatches (12h vs 24h)
- Working day ID changes
- File number validation
- Appointment ID not returned after save

### **🚀 Future Enhancements:**
- Email/SMS reminders 24h before
- Patient notifications on status changes
- Consultation report generation (PDF)
- Patient consultation ratings
- Virtual consultations (telemedicine)
- Appointment rescheduling by patient

---

## 📊 Database State After Seed

```
✅ 14 Patients (including 5 workflow test patients)
✅ 5 Doctors (with full schedules)
✅ 3 Nurses
✅ 2 Frontdesk staff
✅ 57 Total appointments
✅ 9 TODAY's appointments (at different stages)
✅ Multiple consultations (completed and in-progress)
✅ Case plans with different readiness statuses
✅ Vital signs records
✅ Nurse assignments
✅ Care notes (pre-op and post-op)
```

---

## 🔗 Related Documentation

- [Appointment Booking Workflow](./APPOINTMENT_BOOKING_WORKFLOW.md) - Complete technical documentation
- [Appointment Workflow Summary](./APPOINTMENT_WORKFLOW_SUMMARY.md) - Quick reference guide
- [Consultation Workflow Journey Map](../CONSULTATION_WORKFLOW_JOURNEY_MAP.md) - Visual journey map
- [Doctor Availability Guide](../DOCTOR_AVAILABILITY_GUIDE.md) - Scheduling system

---

## 💡 Pro Tips for Demo

1. **Start with Dashboard Views** - Show each role's dashboard first
2. **Follow Time Order** - Demonstrate appointments in chronological order
3. **Highlight Status Changes** - Emphasize how status updates in real-time
4. **Show Navigation Flow** - Demonstrate seamless navigation between pages
5. **Feature Nurse Role** - Often overlooked but crucial to workflow
6. **Emphasize Case Planning** - Show surgical preparation workflow
7. **Point Out Details** - Vital signs, care notes, patient history

---

**🎬 Ready to Demo!** Everything is set up for TODAY. Just login and follow the stages! 🚀
