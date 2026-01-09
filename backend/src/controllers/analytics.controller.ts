import { Request, Response } from 'express';
import * as analyticsService from '../services/analytics.service';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const userId = req.user?.userId;
    const role = req.user?.role;

    const stats = await analyticsService.getDashboardStats(clinicId!, userId, role);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    throw error;
  }
};

export const getAppointmentStats = async (req: Request, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const { days = 7 } = req.query;

    const stats = await analyticsService.getAppointmentStats(clinicId!, Number(days));

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    throw error;
  }
};

export const getAppointmentTypeDistribution = async (req: Request, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;

    const distribution = await analyticsService.getAppointmentTypeDistribution(clinicId!);

    res.json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    throw error;
  }
};

export const getQueuePerformance = async (req: Request, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const { days = 7 } = req.query;

    const performance = await analyticsService.getQueuePerformance(clinicId!, Number(days));

    res.json({
      success: true,
      data: performance,
    });
  } catch (error) {
    throw error;
  }
};

export const getDoctorPerformance = async (req: Request, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const { startDate, endDate } = req.query;

    const performance = await analyticsService.getDoctorPerformance(
      clinicId!,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: performance,
    });
  } catch (error) {
    throw error;
  }
};

export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const userId = req.user?.userId;
    const role = req.user?.role;
    const { limit = 10 } = req.query;

    const activities = await analyticsService.getRecentActivity(
      clinicId!,
      userId!,
      role!,
      Number(limit)
    );

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    throw error;
  }
};

export const getPatientStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const clinicId = req.user?.clinicId;

    const stats = await analyticsService.getPatientStats(userId!, clinicId!);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    throw error;
  }
};

export default {
  getDashboardStats,
  getAppointmentStats,
  getAppointmentTypeDistribution,
  getQueuePerformance,
  getDoctorPerformance,
  getRecentActivity,
  getPatientStats,
};
