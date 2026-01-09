import { prisma } from '../config/database';
import PDFDocument from 'pdfkit';
import { format, startOfDay, endOfDay } from 'date-fns';
import { AppointmentStatus, QueueStatus } from '@prisma/client';

export const generateAppointmentReport = async (
  clinicId: string,
  startDate: Date,
  endDate: Date
) => {
  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      scheduledDate: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
    },
    include: {
      patient: {
        include: {
          user: true,
        },
      },
      doctor: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      scheduledDate: 'asc',
    },
  });

  // Summary statistics
  const summary = {
    total: appointments.length,
    scheduled: appointments.filter((a) => a.status === AppointmentStatus.SCHEDULED).length,
    completed: appointments.filter((a) => a.status === AppointmentStatus.COMPLETED).length,
    cancelled: appointments.filter((a) => a.status === AppointmentStatus.CANCELLED).length,
    noShow: appointments.filter((a) => a.status === AppointmentStatus.NO_SHOW).length,
    video: appointments.filter((a) => a.appointmentType === 'VIDEO').length,
    inPerson: appointments.filter((a) => a.appointmentType === 'IN_PERSON').length,
    urgent: appointments.filter((a) => a.appointmentType === 'URGENT').length,
  };

  return {
    summary,
    appointments: appointments.map((apt) => ({
      id: apt.id,
      patientName: `${apt.patient.user.firstName} ${apt.patient.user.lastName}`,
      doctorName: `Dr. ${apt.doctor.user.firstName} ${apt.doctor.user.lastName}`,
      date: apt.scheduledDate,
      time: apt.scheduledTime,
      type: apt.appointmentType,
      status: apt.status,
      reason: apt.reason,
      notes: apt.notes,
    })),
  };
};

export const generateQueueReport = async (
  clinicId: string,
  startDate: Date,
  endDate: Date
) => {
  const queueEntries = await prisma.queueEntry.findMany({
    where: {
      clinicId,
      createdAt: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
    },
    include: {
      patient: {
        include: {
          user: true,
        },
      },
      doctor: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Calculate metrics
  let totalWaitTime = 0;
  let totalConsultationTime = 0;
  let waitTimeCount = 0;
  let consultationTimeCount = 0;

  queueEntries.forEach((entry) => {
    if (entry.checkedInAt && entry.consultationStartedAt) {
      const waitTime = new Date(entry.consultationStartedAt).getTime() - new Date(entry.checkedInAt).getTime();
      totalWaitTime += waitTime;
      waitTimeCount++;
    }

    if (entry.consultationStartedAt && entry.completedAt) {
      const consultationTime = new Date(entry.completedAt).getTime() - new Date(entry.consultationStartedAt).getTime();
      totalConsultationTime += consultationTime;
      consultationTimeCount++;
    }
  });

  const summary = {
    total: queueEntries.length,
    completed: queueEntries.filter((e) => e.status === QueueStatus.COMPLETED).length,
    cancelled: queueEntries.filter((e) => e.status === QueueStatus.CANCELLED).length,
    noShow: queueEntries.filter((e) => e.status === QueueStatus.NO_SHOW).length,
    averageWaitTime: waitTimeCount > 0 ? Math.round(totalWaitTime / waitTimeCount / 1000 / 60) : 0,
    averageConsultationTime: consultationTimeCount > 0 ? Math.round(totalConsultationTime / consultationTimeCount / 1000 / 60) : 0,
  };

  return {
    summary,
    entries: queueEntries.map((entry) => ({
      id: entry.id,
      queueNumber: entry.queueNumber,
      patientName: `${entry.patient.user.firstName} ${entry.patient.user.lastName}`,
      doctorName: `Dr. ${entry.doctor.user.firstName} ${entry.doctor.user.lastName}`,
      checkedInAt: entry.checkedInAt,
      consultationStartedAt: entry.consultationStartedAt,
      completedAt: entry.completedAt,
      status: entry.status,
      notes: entry.notes,
    })),
  };
};

export const generateDoctorReport = async (
  clinicId: string,
  startDate: Date,
  endDate: Date
) => {
  const doctors = await prisma.doctor.findMany({
    where: {
      clinicId,
    },
    include: {
      user: true,
      appointments: {
        where: {
          scheduledDate: {
            gte: startOfDay(startDate),
            lte: endOfDay(endDate),
          },
        },
      },
      queueEntries: {
        where: {
          createdAt: {
            gte: startOfDay(startDate),
            lte: endOfDay(endDate),
          },
        },
      },
    },
  });

  const doctorStats = doctors.map((doctor) => {
    const totalAppointments = doctor.appointments.length;
    const completedAppointments = doctor.appointments.filter(
      (a) => a.status === AppointmentStatus.COMPLETED
    ).length;
    const cancelledAppointments = doctor.appointments.filter(
      (a) => a.status === AppointmentStatus.CANCELLED
    ).length;

    const totalConsultations = doctor.queueEntries.length;
    const completedConsultations = doctor.queueEntries.filter(
      (e) => e.status === QueueStatus.COMPLETED
    ).length;

    // Calculate average consultation time
    let totalTime = 0;
    let count = 0;
    doctor.queueEntries.forEach((entry) => {
      if (entry.consultationStartedAt && entry.completedAt) {
        totalTime += new Date(entry.completedAt).getTime() - new Date(entry.consultationStartedAt).getTime();
        count++;
      }
    });

    return {
      name: `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`,
      specialization: doctor.specialization,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0,
      totalConsultations,
      completedConsultations,
      avgConsultationTime: count > 0 ? Math.round(totalTime / count / 1000 / 60) : 0,
    };
  });

  return {
    totalDoctors: doctors.length,
    doctors: doctorStats,
  };
};

export const generateFinancialReport = async (
  clinicId: string,
  startDate: Date,
  endDate: Date
) => {
  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      scheduledDate: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
      status: AppointmentStatus.COMPLETED,
    },
    include: {
      doctor: {
        include: {
          user: true,
        },
      },
    },
  });

  // Group by appointment type
  const videoAppointments = appointments.filter((a) => a.appointmentType === 'VIDEO');
  const inPersonAppointments = appointments.filter((a) => a.appointmentType === 'IN_PERSON');
  const urgentAppointments = appointments.filter((a) => a.appointmentType === 'URGENT');

  // Placeholder pricing (would come from database in real implementation)
  const pricing = {
    VIDEO: 50,
    IN_PERSON: 75,
    URGENT: 100,
  };

  const totalRevenue =
    videoAppointments.length * pricing.VIDEO +
    inPersonAppointments.length * pricing.IN_PERSON +
    urgentAppointments.length * pricing.URGENT;

  // Group by doctor
  const doctorRevenue: { [key: string]: any } = {};
  appointments.forEach((apt) => {
    const doctorKey = `${apt.doctor.user.firstName} ${apt.doctor.user.lastName}`;
    if (!doctorRevenue[doctorKey]) {
      doctorRevenue[doctorKey] = {
        name: doctorKey,
        appointments: 0,
        revenue: 0,
      };
    }
    doctorRevenue[doctorKey].appointments++;
    doctorRevenue[doctorKey].revenue += pricing[apt.appointmentType as keyof typeof pricing];
  });

  return {
    summary: {
      totalRevenue,
      totalAppointments: appointments.length,
      videoRevenue: videoAppointments.length * pricing.VIDEO,
      inPersonRevenue: inPersonAppointments.length * pricing.IN_PERSON,
      urgentRevenue: urgentAppointments.length * pricing.URGENT,
      averagePerAppointment: appointments.length > 0 ? Math.round(totalRevenue / appointments.length) : 0,
    },
    byDoctor: Object.values(doctorRevenue),
    byType: {
      video: { count: videoAppointments.length, revenue: videoAppointments.length * pricing.VIDEO },
      inPerson: { count: inPersonAppointments.length, revenue: inPersonAppointments.length * pricing.IN_PERSON },
      urgent: { count: urgentAppointments.length, revenue: urgentAppointments.length * pricing.URGENT },
    },
  };
};

export const generatePDFReport = async (
  reportType: string,
  data: any,
  startDate: Date,
  endDate: Date
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(20).text('Telemedicine Queue Manager', { align: 'center' });
      doc.fontSize(16).text(`${reportType} Report`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(
        `Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`,
        { align: 'center' }
      );
      doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy hh:mm a')}`, { align: 'center' });
      doc.moveDown(2);

      // Content based on report type
      if (reportType === 'Appointment') {
        generateAppointmentPDF(doc, data);
      } else if (reportType === 'Queue') {
        generateQueuePDF(doc, data);
      } else if (reportType === 'Doctor') {
        generateDoctorPDF(doc, data);
      } else if (reportType === 'Financial') {
        generateFinancialPDF(doc, data);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

function generateAppointmentPDF(doc: PDFKit.PDFDocument, data: any) {
  doc.fontSize(14).text('Summary', { underline: true });
  doc.fontSize(10).moveDown(0.5);
  doc.text(`Total Appointments: ${data.summary.total}`);
  doc.text(`Scheduled: ${data.summary.scheduled}`);
  doc.text(`Completed: ${data.summary.completed}`);
  doc.text(`Cancelled: ${data.summary.cancelled}`);
  doc.text(`No Show: ${data.summary.noShow}`);
  doc.moveDown();
  doc.text(`Video: ${data.summary.video}`);
  doc.text(`In-Person: ${data.summary.inPerson}`);
  doc.text(`Urgent: ${data.summary.urgent}`);
  doc.moveDown(2);

  doc.fontSize(14).text('Appointment Details', { underline: true });
  doc.moveDown(0.5);

  data.appointments.slice(0, 50).forEach((apt: any, index: number) => {
    if (doc.y > 700) doc.addPage();
    doc.fontSize(10);
    doc.text(
      `${index + 1}. ${apt.patientName} → ${apt.doctorName} | ${format(new Date(apt.date), 'MMM dd')} | ${apt.status}`
    );
  });
}

function generateQueuePDF(doc: PDFKit.PDFDocument, data: any) {
  doc.fontSize(14).text('Summary', { underline: true });
  doc.fontSize(10).moveDown(0.5);
  doc.text(`Total Queue Entries: ${data.summary.total}`);
  doc.text(`Completed: ${data.summary.completed}`);
  doc.text(`Cancelled: ${data.summary.cancelled}`);
  doc.text(`No Show: ${data.summary.noShow}`);
  doc.text(`Average Wait Time: ${data.summary.averageWaitTime} minutes`);
  doc.text(`Average Consultation Time: ${data.summary.averageConsultationTime} minutes`);
  doc.moveDown(2);

  doc.fontSize(14).text('Queue Details', { underline: true });
  doc.moveDown(0.5);

  data.entries.slice(0, 50).forEach((entry: any, index: number) => {
    if (doc.y > 700) doc.addPage();
    doc.fontSize(10);
    doc.text(
      `${index + 1}. #${entry.queueNumber} - ${entry.patientName} → ${entry.doctorName} | ${entry.status}`
    );
  });
}

function generateDoctorPDF(doc: PDFKit.PDFDocument, data: any) {
  doc.fontSize(14).text('Doctor Performance Summary', { underline: true });
  doc.fontSize(10).moveDown(0.5);
  doc.text(`Total Doctors: ${data.totalDoctors}`);
  doc.moveDown(2);

  data.doctors.forEach((doctor: any, index: number) => {
    if (doc.y > 650) doc.addPage();
    doc.fontSize(12).text(`${index + 1}. ${doctor.name} (${doctor.specialization})`, { underline: true });
    doc.fontSize(10).moveDown(0.3);
    doc.text(`  Total Appointments: ${doctor.totalAppointments}`);
    doc.text(`  Completed: ${doctor.completedAppointments}`);
    doc.text(`  Cancelled: ${doctor.cancelledAppointments}`);
    doc.text(`  Completion Rate: ${doctor.completionRate}%`);
    doc.text(`  Total Consultations: ${doctor.totalConsultations}`);
    doc.text(`  Avg Consultation Time: ${doctor.avgConsultationTime} minutes`);
    doc.moveDown();
  });
}

function generateFinancialPDF(doc: PDFKit.PDFDocument, data: any) {
  doc.fontSize(14).text('Financial Summary', { underline: true });
  doc.fontSize(10).moveDown(0.5);
  doc.text(`Total Revenue: $${data.summary.totalRevenue.toLocaleString()}`);
  doc.text(`Total Appointments: ${data.summary.totalAppointments}`);
  doc.text(`Average per Appointment: $${data.summary.averagePerAppointment}`);
  doc.moveDown();
  doc.text(`Video Revenue: $${data.summary.videoRevenue.toLocaleString()}`);
  doc.text(`In-Person Revenue: $${data.summary.inPersonRevenue.toLocaleString()}`);
  doc.text(`Urgent Revenue: $${data.summary.urgentRevenue.toLocaleString()}`);
  doc.moveDown(2);

  doc.fontSize(14).text('Revenue by Doctor', { underline: true });
  doc.moveDown(0.5);

  data.byDoctor.forEach((doctor: any, index: number) => {
    if (doc.y > 700) doc.addPage();
    doc.fontSize(10);
    doc.text(`${index + 1}. ${doctor.name}: $${doctor.revenue.toLocaleString()} (${doctor.appointments} appointments)`);
  });
}

export const generateCSVReport = (reportType: string, data: any): string => {
  let csv = '';

  if (reportType === 'Appointment') {
    csv = 'Patient,Doctor,Date,Time,Type,Status,Reason\n';
    data.appointments.forEach((apt: any) => {
      csv += `"${apt.patientName}","${apt.doctorName}","${format(new Date(apt.date), 'yyyy-MM-dd')}","${format(new Date(apt.time), 'HH:mm')}","${apt.type}","${apt.status}","${apt.reason || ''}"\n`;
    });
  } else if (reportType === 'Queue') {
    csv = 'Queue #,Patient,Doctor,Checked In,Started,Completed,Status\n';
    data.entries.forEach((entry: any) => {
      csv += `"${entry.queueNumber}","${entry.patientName}","${entry.doctorName}","${entry.checkedInAt ? format(new Date(entry.checkedInAt), 'yyyy-MM-dd HH:mm') : ''}","${entry.consultationStartedAt ? format(new Date(entry.consultationStartedAt), 'yyyy-MM-dd HH:mm') : ''}","${entry.completedAt ? format(new Date(entry.completedAt), 'yyyy-MM-dd HH:mm') : ''}","${entry.status}"\n`;
    });
  } else if (reportType === 'Doctor') {
    csv = 'Doctor,Specialization,Total Appointments,Completed,Cancelled,Completion Rate,Avg Consultation Time\n';
    data.doctors.forEach((doctor: any) => {
      csv += `"${doctor.name}","${doctor.specialization}","${doctor.totalAppointments}","${doctor.completedAppointments}","${doctor.cancelledAppointments}","${doctor.completionRate}%","${doctor.avgConsultationTime}min"\n`;
    });
  } else if (reportType === 'Financial') {
    csv = 'Doctor,Appointments,Revenue\n';
    data.byDoctor.forEach((doctor: any) => {
      csv += `"${doctor.name}","${doctor.appointments}","$${doctor.revenue}"\n`;
    });
  }

  return csv;
};

export default {
  generateAppointmentReport,
  generateQueueReport,
  generateDoctorReport,
  generateFinancialReport,
  generatePDFReport,
  generateCSVReport,
};
