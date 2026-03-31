ALTER TABLE "sessions" DROP CONSTRAINT "sessions_patient_id_patients_id_fk";
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
