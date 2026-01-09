import { Request, Response } from 'express';
import * as settingsService from '../services/settings.service';

export const getSettings = async (req: Request, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const settings = await settingsService.getClinicSettings(clinicId!);

    res.json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    throw error;
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const settings = await settingsService.updateClinicSettings(clinicId!, req.body);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: { settings },
    });
  } catch (error) {
    throw error;
  }
};

export default {
  getSettings,
  updateSettings,
};
