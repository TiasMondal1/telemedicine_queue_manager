-- Add prescription and medical record tables

-- Prescriptions table
CREATE TABLE IF NOT EXISTS "Prescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "medications" TEXT NOT NULL,
    "instructions" TEXT,
    "diagnosis" TEXT,
    "validUntil" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE,
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE,
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE,
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE
);

-- Medical Records table
CREATE TABLE IF NOT EXISTS "MedicalRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE,
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE,
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Prescription_appointmentId_idx" ON "Prescription"("appointmentId");
CREATE INDEX IF NOT EXISTS "Prescription_patientId_idx" ON "Prescription"("patientId");
CREATE INDEX IF NOT EXISTS "Prescription_doctorId_idx" ON "Prescription"("doctorId");
CREATE INDEX IF NOT EXISTS "MedicalRecord_patientId_idx" ON "MedicalRecord"("patientId");
