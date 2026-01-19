import db from "@/lib/db";
import React from "react";
import { MedicalHistory } from "./medical-history";

interface DataProps {
  id?: number | string;
  patientId: string;
}

export const MedicalHistoryContainer = async ({ id, patientId }: DataProps) => {
  const data = await db.medicalRecord.findMany({
    where: { patient_id: patientId },
    include: {
      diagnoses: { include: { doctor: true } },
      lab_tests: true,
    },

    orderBy: { created_at: "desc" },
  });
  
  // Transform data to match component's expected interface
  const transformedData = data.map((record) => ({
    ...record,
    diagnosis: record.diagnoses,
    lab_test: record.lab_tests,
  }));
  
  return (
    <>
      <MedicalHistory data={transformedData} isShowProfile={false} />
    </>
  );
};
