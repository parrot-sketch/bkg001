import { NewPatient } from "@/components/new-patient";
import { getPatientById } from "@/utils/services/patient";
import { getCurrentUser } from "@/lib/auth/server-auth";
import React from "react";

export const dynamic = 'force-dynamic';

const Registration = async () => {
  const authUser = await getCurrentUser();

  const { data } = await getPatientById(authUser?.userId || '');

  return (
    <div className="w-full h-full flex justify-center">
      <div className="max-w-6xl w-full relative pb-10">
        <NewPatient data={data!} type={!data ? "create" : "update"} />
      </div>
    </div>
  );
};

export default Registration;
