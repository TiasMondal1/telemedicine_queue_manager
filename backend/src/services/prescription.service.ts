import { prisma } from '../config/database';

export const createPrescription = async (
  appointmentId: string,
  doctorUserId: string,
  data: {
    medications: string;
    instructions?: string;
    diagnosis?: string;
    validUntil?: Date;
  }
) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      doctor: true,
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  // Verify doctor owns this appointment
  if (appointment.doctor.userId !== doctorUserId) {
    throw new Error('Unauthorized');
  }

  const prescription = await prisma.$executeRaw`
    INSERT INTO "Prescription" (
      "id", "appointmentId", "patientId", "doctorId", "clinicId",
      "medications", "instructions", "diagnosis", "validUntil", 
      "createdAt", "updatedAt"
    ) VALUES (
      ${generateId()}, ${appointmentId}, ${appointment.patientId}, 
      ${appointment.doctorId}, ${appointment.clinicId},
      ${data.medications}, ${data.instructions || null}, 
      ${data.diagnosis || null}, ${data.validUntil || null},
      ${new Date()}, ${new Date()}
    )
  `;

  return prescription;
};

export const getPrescriptionsByPatient = async (patientUserId: string, clinicId: string) => {
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  const prescriptions = await prisma.$queryRaw`
    SELECT 
      p.*,
      a."scheduledDate",
      u."firstName" as "doctorFirstName",
      u."lastName" as "doctorLastName"
    FROM "Prescription" p
    INNER JOIN "Appointment" a ON p."appointmentId" = a.id
    INNER JOIN "Doctor" d ON p."doctorId" = d.id
    INNER JOIN "User" u ON d."userId" = u.id
    WHERE p."patientId" = ${patient.id}
    AND p."clinicId" = ${clinicId}
    ORDER BY p."createdAt" DESC
  `;

  return prescriptions;
};

export const getPrescriptionsByDoctor = async (doctorUserId: string, clinicId: string) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUserId },
  });

  if (!doctor) {
    throw new Error('Doctor not found');
  }

  const prescriptions = await prisma.$queryRaw`
    SELECT 
      p.*,
      a."scheduledDate",
      u."firstName" as "patientFirstName",
      u."lastName" as "patientLastName"
    FROM "Prescription" p
    INNER JOIN "Appointment" a ON p."appointmentId" = a.id
    INNER JOIN "Patient" pt ON p."patientId" = pt.id
    INNER JOIN "User" u ON pt."userId" = u.id
    WHERE p."doctorId" = ${doctor.id}
    AND p."clinicId" = ${clinicId}
    ORDER BY p."createdAt" DESC
  `;

  return prescriptions;
};

function generateId(): string {
  return 'presc_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export default {
  createPrescription,
  getPrescriptionsByPatient,
  getPrescriptionsByDoctor,
};
