# Quick Demo Reference Card

## 🔐 Test Credentials

```
┌─────────────────────────────────────────────────────────┐
│ ROLE          EMAIL                              PASS   │
├─────────────────────────────────────────────────────────┤
│ Admin         admin@nairobisculpt.com            admin123       │
│ Frontdesk     receptionist@nairobisculpt.com     frontdesk123   │
│ Nurse         jane.wambui@nairobisculpt.com      nurse123       │
│ Doctor 1      dorsi.jowi@nairobisculpt.com       doctor123      │
│ Doctor 2      mukami.gathariki@nairobisculpt.com doctor123      │
│ Doctor 3      john.ogalo@nairobisculpt.com       doctor123      │
│ Patient 1     sarah.arrival@test.com             patient123     │
│ Patient 2     james.checkedin@test.com           patient123     │
│ Patient 3     grace.consulting@test.com          patient123     │
│ Patient 4     daniel.completed@test.com          patient123     │
│ Test Patient  test.patient@test.com              patient123     │
└─────────────────────────────────────────────────────────┘
```

---

## 📅 TODAY's Appointments Quick View

```
┌────────┬─────────────────────┬────────────┬──────────────┬─────────────────────┐
│ TIME   │ PATIENT             │ STATUS     │ DOCTOR       │ WHAT TO SHOW        │
├────────┼─────────────────────┼────────────┼──────────────┼─────────────────────┤
│ 08:00  │ Daniel Mutua        │ COMPLETED  │ Dorsi Jowi   │ ✅ Finished consult │
│        │ (TEST104)           │            │              │ ✅ Surgery scheduled│
│        │                     │            │              │ ✅ Case plan READY  │
├────────┼─────────────────────┼────────────┼──────────────┼─────────────────────┤
│ 09:00  │ Sarah Kimani        │ PENDING    │ Dorsi Jowi   │ ⏳ Needs check-in   │
│        │ (TEST101)           │            │              │ 🎯 Demo full flow  │
├────────┼─────────────────────┼────────────┼──────────────┼─────────────────────┤
│ 09:30  │ James Odhiambo      │ SCHEDULED  │ Mukami       │ ✅ Checked in       │
│        │ (TEST102)           │            │              │ 🩺 Vitals recorded │
│        │                     │            │              │ 👨‍⚕️ Ready for dr   │
├────────┼─────────────────────┼────────────┼──────────────┼─────────────────────┤
│ 10:00  │ Grace Wanjiru       │ IN_PROGRES│ John Ogalo   │ 🏥 Active consult   │
│        │ (TEST103)           │            │              │ 💻 Show workspace  │
├────────┼─────────────────────┼────────────┼──────────────┼─────────────────────┤
│ 10:30  │ Test Patient        │ SCHEDULED  │ Dorsi Jowi   │ ✅ Checked in       │
│        │ (TEST001)           │            │              │ 👨‍⚕️ Can start      │
├────────┼─────────────────────┼────────────┼──────────────┼─────────────────────┤
│ 11:00  │ Millicent Muchiri   │ PENDING    │ Dorsi Jowi   │ ⏳ Waiting          │
├────────┼─────────────────────┼────────────┼──────────────┼─────────────────────┤
│ 11:30  │ Rhoda Atieno        │ SCHEDULED  │ John Ogalo   │ ✅ Ready for dr     │
├────────┼─────────────────────┼────────────┼──────────────┼─────────────────────┤
│ 14:00  │ Mary Njeri          │ PENDING    │ Mukami       │ ⏳ Afternoon apt    │
├────────┼─────────────────────┼────────────┼──────────────┼─────────────────────┤
│ 15:00  │ Sandra Nyakiongora  │ PENDING    │ Mukami       │ ⏳ Afternoon apt    │
├────────┼─────────────────────┼────────────┼──────────────┼─────────────────────┤
│ 16:00  │ Amina Hassan        │ PENDING    │ Dorsi Jowi   │ ⏳ Late afternoon   │
└────────┴─────────────────────┴────────────┴──────────────┴─────────────────────┘
```

---

## 🎯 5-Minute Demo Script

### **STEP 1: Patient View** (30 seconds)
```
Login: sarah.arrival@test.com / patient123
Go to: /patient/appointments
Show: Appointment for TODAY at 09:00 (PENDING)
```

### **STEP 2: Frontdesk Check-In** (1 minute)
```
Login: receptionist@nairobisculpt.com / frontdesk123
Go to: /frontdesk/appointments
Action: Check in Sarah Kimani (09:00)
Show: Status changes PENDING → SCHEDULED
```

### **STEP 3: Doctor Begins Consultation** (2 minutes)
```
Login: dorsi.jowi@nairobisculpt.com / doctor123
Go to: /doctor/appointments
Action: Click "Begin Consultation" for Sarah Kimani
Show: Start dialog → Consultation workspace
```

### **STEP 4: Active Consultation Workspace** (1 minute)
```
Already logged in as doctor
Show: 
  - Patient info panel
  - Structured notes tabs
  - Clinical documentation
  - Quick actions
```

### **STEP 5: Complete & Review** (30 seconds)
```
Show completed consultation: Daniel Mutua
Go to: /doctor/patients/{id} → Cases & Procedures
Show: Case plan with READY status
```

---

## 🎬 Best Demo Flow (15 minutes)

### **Act 1: Patient Journey** (3 min)
1. Patient books appointment ✓ (Sarah - already booked)
2. Patient views in dashboard
3. Patient waits for appointment day

### **Act 2: Arrival & Check-In** (3 min)
4. Frontdesk sees appointment
5. Patient arrives → Check-in
6. Nurse records vitals (James - already done)
7. Dashboard updates

### **Act 3: Consultation** (6 min)
8. Doctor views appointments
9. Begin consultation with Sarah
10. Complete structured notes
11. Select outcome & patient decision
12. Complete consultation
13. Schedule follow-up

### **Act 4: Case Planning** (3 min)
14. View completed consultation (Daniel)
15. Show case plan details
16. Demonstrate case readiness
17. Review surgical preparation

---

## 🚀 Pre-Demo Checklist

- [ ] Database seeded with `npm run db:seed`
- [ ] Dev server running `npm run dev`
- [ ] Browser tabs ready:
  - Tab 1: Patient login
  - Tab 2: Frontdesk login
  - Tab 3: Doctor login
  - Tab 4: This reference card
- [ ] Test login with each role
- [ ] Verify TODAY's appointments show up
- [ ] Check that Grace Wanjiru shows IN_PROGRESS

---

## 💡 Key Features to Highlight

### **For Patients:**
- ✅ Simple, clean appointment view
- ✅ Clear status indicators
- ✅ See upcoming and past appointments
- ✅ Easy-to-understand interface

### **For Frontdesk:**
- ✅ Dashboard metrics (pending, checked-in)
- ✅ One-click check-in
- ✅ Real-time updates
- ✅ Search and filter

### **For Nurses:**
- ✅ Patient assignments
- ✅ Vital signs recording
- ✅ Care notes (pre-op, post-op)
- ✅ Support consultation prep

### **For Doctors:**
- ✅ Comprehensive consultation workspace
- ✅ Structured clinical documentation
- ✅ Patient history at fingertips
- ✅ Easy navigation (View Profile during consult)
- ✅ Follow-up scheduling
- ✅ Case planning and readiness tracking
- ✅ Surgical preparation workflow

---

## 🔥 Demo Power Moves

1. **Show Status Transitions Live**
   - Check in patient
   - Watch dashboard update
   - Show real-time changes

2. **Navigate During Consultation**
   - Click "View Full Profile"
   - Show "Back to Consultation" button
   - Demonstrate context preservation

3. **Highlight Structured Notes**
   - Chief Complaint
   - Assessment
   - Plan
   - Outcome Type dropdowns

4. **Show Case Planning**
   - READY status indicator
   - Comprehensive pre-op notes
   - Risk factor tracking
   - Surgical instructions

5. **Emphasize Vitals Integration**
   - Nurse records vitals
   - Doctor sees immediately
   - Part of clinical record

---

## 🎯 Workflow Status Legend

```
⏳ PENDING     = Booked, waiting for check-in
✓  SCHEDULED   = Checked in, ready for doctor
🏥 IN_PROGRESS = Consultation active
✅ COMPLETED   = Consultation finished
❌ CANCELLED   = Appointment cancelled
```

---

## 📱 URLs Quick Access

```
Patient:    http://localhost:3000/patient/dashboard
Frontdesk:  http://localhost:3000/frontdesk/dashboard
Nurse:      http://localhost:3000/nurse/dashboard
Doctor:     http://localhost:3000/doctor/dashboard

Appointments:
  Patient:    /patient/appointments
  Frontdesk:  /frontdesk/appointments
  Doctor:     /doctor/appointments

Consultations:
  Doctor:     /doctor/consultations

Patient Profile:
  Doctor:     /doctor/patients/{patientId}
```

---

## 🎤 Talking Points

### **Opening:**
"This is Nairobi Sculpt's complete healthcare workflow system - from patient booking through surgical case planning. Let me show you a real patient's journey TODAY."

### **Frontdesk:**
"The frontdesk sees all today's appointments. With one click, they check in Sarah - and watch the status update in real-time across the system."

### **Doctor:**
"Dr. Jowi sees Sarah is ready. He clicks 'Begin Consultation' and enters a comprehensive workspace with the patient's complete history, vitals, and structured documentation."

### **Consultation:**
"This isn't just a text box - it's structured clinical notes: Chief Complaint, Assessment, Plan. The outcome can be tracked, and follow-ups scheduled instantly."

### **Case Planning:**
"For surgical patients like Daniel, we have complete case planning - procedure details, risk assessment, pre-op requirements, and readiness tracking. When it shows READY, everyone knows the patient is prepared for surgery."

### **Closing:**
"Every role - patient, frontdesk, nurse, doctor - has exactly what they need, when they need it. No lost information, no miscommunication, complete visibility."

---

**🎬 You're ready! Open this file during your demo for quick reference. Good luck! 🚀**
