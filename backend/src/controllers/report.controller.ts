import { Request, Response } from 'express';
import * as reportService from '../services/report.service';
import { AppError } from '../middleware/errorHandler';

export const generateReport = async (req: Request, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const { reportType, startDate, endDate, format } = req.query;

    if (!reportType || !startDate || !endDate) {
      throw new AppError('Missing required parameters', 400);
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    let reportData;

    switch (reportType) {
      case 'appointment':
        reportData = await reportService.generateAppointmentReport(clinicId!, start, end);
        break;
      case 'queue':
        reportData = await reportService.generateQueueReport(clinicId!, start, end);
        break;
      case 'doctor':
        reportData = await reportService.generateDoctorReport(clinicId!, start, end);
        break;
      case 'financial':
        reportData = await reportService.generateFinancialReport(clinicId!, start, end);
        break;
      default:
        throw new AppError('Invalid report type', 400);
    }

    if (format === 'pdf') {
      const pdfBuffer = await reportService.generatePDFReport(
        reportType.charAt(0).toUpperCase() + reportType.slice(1),
        reportData,
        start,
        end
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf"`
      );
      res.send(pdfBuffer);
    } else if (format === 'csv') {
      const csv = reportService.generateCSVReport(
        reportType.charAt(0).toUpperCase() + reportType.slice(1),
        reportData
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.csv"`
      );
      res.send(csv);
    } else {
      // JSON format
      res.json({
        success: true,
        data: reportData,
      });
    }
  } catch (error) {
    throw error;
  }
};

export const getAppointmentReport = async (req: Request, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const { startDate, endDate } = req.query;

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const reportData = await reportService.generateAppointmentReport(clinicId!, start, end);

    res.json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    throw error;
  }
};

export const getQueueReport = async (req: Request, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const { startDate, endDate } = req.query;

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const reportData = await reportService.generateQueueReport(clinicId!, start, end);

    res.json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    throw error;
  }
};

export const getDoctorReport = async (req: Request, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const { startDate, endDate } = req.query;

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const reportData = await reportService.generateDoctorReport(clinicId!, start, end);

    res.json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    throw error;
  }
};

export const getFinancialReport = async (req: Request, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const { startDate, endDate } = req.query;

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const reportData = await reportService.generateFinancialReport(clinicId!, start, end);

    res.json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    throw error;
  }
};

export default {
  generateReport,
  getAppointmentReport,
  getQueueReport,
  getDoctorReport,
  getFinancialReport,
};
