import { Request, Response } from 'express';
import * as prescriptionService from '../services/prescription.service';

export const createPrescription = async (req: Request, res: Response) => {
  try {
    const doctorUserId = req.user?.userId;
    const { appointmentId, medications, instructions, diagnosis, validUntil } = req.body;

    const prescription = await prescriptionService.createPrescription(
      appointmentId,
      doctorUserId!,
      {
        medications,
        instructions,
        diagnosis,
        validUntil: validUntil ? new Date(validUntil) : undefined,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      data: { prescription },
    });
  } catch (error) {
    throw error;
  }
};

export const getMyPrescriptions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const clinicId = req.user?.clinicId;
    const role = req.user?.role;

    let prescriptions;

    if (role === 'PATIENT') {
      prescriptions = await prescriptionService.getPrescriptionsByPatient(userId!, clinicId!);
    } else if (role === 'DOCTOR') {
      prescriptions = await prescriptionService.getPrescriptionsByDoctor(userId!, clinicId!);
    } else {
      throw new Error('Invalid role for this endpoint');
    }

    res.json({
      success: true,
      data: { prescriptions },
    });
  } catch (error) {
    throw error;
  }
};

export default {
  createPrescription,
  getMyPrescriptions,
};
