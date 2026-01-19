#!/bin/bash

# Test script for Consultation Workflow API Routes
# Make sure the Next.js dev server is running: npm run dev

BASE_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Testing Consultation Workflow API Routes"
echo "========================================"
echo ""

# Step 1: Login as Patient (to get patient token)
echo -e "${YELLOW}Step 1: Login as Patient${NC}"
PATIENT_LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "password123"
  }')

echo "Patient Login Response: $PATIENT_LOGIN_RESPONSE"
PATIENT_TOKEN=$(echo $PATIENT_LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$PATIENT_TOKEN" ]; then
  echo -e "${RED}Failed to get patient token. Please check if user exists.${NC}"
  echo "You may need to register a patient first."
  exit 1
fi

echo -e "${GREEN}Patient Token: ${PATIENT_TOKEN:0:50}...${NC}"
echo ""

# Step 2: Submit Consultation Request
echo -e "${YELLOW}Step 2: Submit Consultation Request${NC}"
SUBMIT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/consultations/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${PATIENT_TOKEN}" \
  -d '{
    "patientId": "patient-1",
    "serviceId": 1,
    "concernDescription": "I need a consultation about a skin condition",
    "preferredDate": "2025-12-31",
    "timePreference": "Morning",
    "isOver18": true,
    "hasSeriousConditions": "no",
    "isPregnant": "no",
    "contactConsent": true,
    "privacyConsent": true,
    "acknowledgmentConsent": true
  }')

echo "Submit Response: $SUBMIT_RESPONSE"
APPOINTMENT_ID=$(echo $SUBMIT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$APPOINTMENT_ID" ]; then
  echo -e "${RED}Failed to get appointment ID from submit response${NC}"
  exit 1
fi

echo -e "${GREEN}Appointment ID: $APPOINTMENT_ID${NC}"
echo ""

# Step 3: Login as Frontdesk (to review request)
echo -e "${YELLOW}Step 3: Login as Frontdesk${NC}"
FRONTDESK_LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "frontdesk@example.com",
    "password": "password123"
  }')

echo "Frontdesk Login Response: $FRONTDESK_LOGIN_RESPONSE"
FRONTDESK_TOKEN=$(echo $FRONTDESK_LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$FRONTDESK_TOKEN" ]; then
  echo -e "${RED}Failed to get Frontdesk token. Please check if user exists.${NC}"
  exit 1
fi

echo -e "${GREEN}Frontdesk Token: ${FRONTDESK_TOKEN:0:50}...${NC}"
echo ""

# Step 4: Review Consultation Request (Approve)
echo -e "${YELLOW}Step 4: Review Consultation Request (Approve)${NC}"
REVIEW_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/consultations/${APPOINTMENT_ID}/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${FRONTDESK_TOKEN}" \
  -d '{
    "action": "approve",
    "proposedDate": "2025-12-31",
    "proposedTime": "10:00 AM",
    "reviewNotes": "Approved for consultation"
  }')

echo "Review Response: $REVIEW_RESPONSE"
echo ""

# Step 5: Confirm Consultation (as Patient)
echo -e "${YELLOW}Step 5: Confirm Consultation (as Patient)${NC}"
CONFIRM_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/consultations/${APPOINTMENT_ID}/confirm" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${PATIENT_TOKEN}")

echo "Confirm Response: $CONFIRM_RESPONSE"
echo ""

echo -e "${GREEN}All tests completed!${NC}"
