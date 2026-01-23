import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { redirect } from "next/navigation";
import { NoDataFound } from "../no-data-found";
import { AddDiagnosis } from "../dialogs/add-diagnosis";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { checkRole } from "@/lib/utils/roles";
import { record } from "zod";
import { MedicalHistoryCard } from "./medical-history-card";

export const DiagnosisContainer = async ({
  patientId,
  doctorId,
  id,
}: {
  patientId: string;
  doctorId: string;
  id: string;
}) => {
  const user = await getCurrentUser();
  const userId = user?.userId;

  if (!userId) redirect("/login");

  const data = await db.medicalRecord.findFirst({
    where: { appointment_id: Number(id) },
    include: {
      diagnoses: {
        include: { doctor: true },
        orderBy: { created_at: "desc" },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const diagnosis = data?.diagnoses || null;
  const isPatient = await checkRole("PATIENT");

  return (
    <div>
      {diagnosis?.length === 0 || !diagnosis ? (
        <div className="flex flex-col items-center justify-center mt-20">
          <NoDataFound note="No diagnosis found" />
          <AddDiagnosis
            key={new Date().getTime()}
            patientId={patientId}
            doctorId={doctorId}
            appointmentId={id}
            medicalId={data?.id.toString() || ""}
          />
        </div>
      ) : (
        <section className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Medical Records</CardTitle>

              {!isPatient && (
                <AddDiagnosis
                  key={new Date().getTime()}
                  patientId={patientId}
                  doctorId={doctorId}
                  appointmentId={id}
                  medicalId={data?.id.toString() || ""}
                />
              )}
            </CardHeader>

            <CardContent className="space-y-8">
              {diagnosis?.map((record: any, id: number) => (
                <div key={record.id}>
                  <MedicalHistoryCard record={record} index={id} />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
};
