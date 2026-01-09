import { prisma } from '../config/database';
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, endOfWeek, endOfMonth, format } from 'date-fns';
import { AppointmentStatus, QueueStatus, Role } from '@prisma/client';

export const getDashboardStats = async (clinicId: string, userId?: string, role?: string) => {
  const today = new Date();
  const startToday = startOfDay(today);
  const endToday = endOfDay(today);
  const startWeek = startOfWeek(today);
  const startMonth = startOfMonth(today);

  // Common stats for all roles
  const stats: any = {
    today: {
      appointments: 0,
      patients: 0,
      queueLength: 0,
    },
    week: {
      appointments: 0,
      patients: 0,
    },
    month: {
      appointments: 0,
      patients: 0,
    },
  };

  // Today's appointments
  stats.today.appointments = await prisma.appointment.count({
    where: {
      clinicId,
      scheduledDate: {
        gte: startToday,
        lte: endToday,
      },
      ...(role === Role.DOCTOR && userId ? { doctorId: userId } : {}),
    },
  });

  // Today's unique patients
  const todayAppointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      scheduledDate: {
        gte: startToday,
        lte: endToday,
      },
      ...(role === Role.DOCTOR && userId ? { doctorId: userId } : {}),
    },
    select: {
      patientId: true,
    },
  });
  stats.today.patients = new Set(todayAppointments.map(a => a.patientId)).size;

  // Current queue length
  stats.today.queueLength = await prisma.queueEntry.count({
    where: {
      clinicId,
      status: {
        in: [QueueStatus.WAITING, QueueStatus.CHECKED_IN],
      },
      ...(role === Role.DOCTOR && userId ? { doctorId: userId } : {}),
    },
  });

  // This week's stats
  stats.week.appointments = await prisma.appointment.count({
    where: {
      clinicId,
      scheduledDate: {
        gte: startWeek,
        lte: endToday,
      },
      ...(role === Role.DOCTOR && userId ? { doctorId: userId } : {}),
    },
  });

  const weekAppointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      scheduledDate: {
        gte: startWeek,
        lte: endToday,
      },
      ...(role === Role.DOCTOR && userId ? { doctorId: userId } : {}),
    },
    select: {
      patientId: true,
    },
  });
  stats.week.patients = new Set(weekAppointments.map(a => a.patientId)).size;

  // This month's stats
  stats.month.appointments = await prisma.appointment.count({
    where: {
      clinicId,
      scheduledDate: {
        gte: startMonth,
        lte: endToday,
      },
      ...(role === Role.DOCTOR && userId ? { doctorId: userId } : {}),
    },
  });

  const monthAppointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      scheduledDate: {
        gte: startMonth,
        lte: endToday,
      },
      ...(role === Role.DOCTOR && userId ? { doctorId: userId } : {}),
    },
    select: {
      patientId: true,
    },
  });
  stats.month.patients = new Set(monthAppointments.map(a => a.patientId)).size;

  return stats;
};

export const getAppointmentStats = async (clinicId: string, days: number = 7) => {
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, days - 1));

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      scheduledDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      scheduledDate: true,
      status: true,
      appointmentType: true,
    },
  });

  // Group by date
  const dailyStats: { [key: string]: any } = {};
  
  for (let i = 0; i < days; i++) {
    const date = subDays(endDate, days - 1 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    dailyStats[dateStr] = {
      date: dateStr,
      total: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
    };
  }

  appointments.forEach(apt => {
    const dateStr = format(new Date(apt.scheduledDate), 'yyyy-MM-dd');
    if (dailyStats[dateStr]) {
      dailyStats[dateStr].total++;
      if (apt.status === AppointmentStatus.SCHEDULED) dailyStats[dateStr].scheduled++;
      if (apt.status === AppointmentStatus.COMPLETED) dailyStats[dateStr].completed++;
      if (apt.status === AppointmentStatus.CANCELLED) dailyStats[dateStr].cancelled++;
      if (apt.status === AppointmentStatus.NO_SHOW) dailyStats[dateStr].noShow++;
    }
  });

  return Object.values(dailyStats);
};

export const getAppointmentTypeDistribution = async (clinicId: string) => {
  const appointments = await prisma.appointment.groupBy({
    by: ['appointmentType'],
    where: {
      clinicId,
      scheduledDate: {
        gte: startOfMonth(new Date()),
      },
    },
    _count: true,
  });

  return appointments.map(apt => ({
    type: apt.appointmentType,
    count: apt._count,
  }));
};

export const getQueuePerformance = async (clinicId: string, days: number = 7) => {
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, days - 1));

  const queueEntries = await prisma.queueEntry.findMany({
    where: {
      clinicId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      createdAt: true,
      checkedInAt: true,
      calledAt: true,
      consultationStartedAt: true,
      completedAt: true,
      status: true,
    },
  });

  const stats = {
    averageWaitTime: 0,
    averageConsultationTime: 0,
    totalProcessed: 0,
    totalCompleted: 0,
  };

  let totalWaitTime = 0;
  let totalConsultationTime = 0;
  let waitTimeCount = 0;
  let consultationTimeCount = 0;

  queueEntries.forEach(entry => {
    stats.totalProcessed++;
    
    if (entry.status === QueueStatus.COMPLETED) {
      stats.totalCompleted++;
    }

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

  stats.averageWaitTime = waitTimeCount > 0 ? Math.round(totalWaitTime / waitTimeCount / 1000 / 60) : 0; // in minutes
  stats.averageConsultationTime = consultationTimeCount > 0 ? Math.round(totalConsultationTime / consultationTimeCount / 1000 / 60) : 0;

  return stats;
};

export const getDoctorPerformance = async (clinicId: string, startDate?: Date, endDate?: Date) => {
  const start = startDate || startOfMonth(new Date());
  const end = endDate || endOfMonth(new Date());

  const doctors = await prisma.doctor.findMany({
    where: {
      clinicId,
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      appointments: {
        where: {
          scheduledDate: {
            gte: start,
            lte: end,
          },
        },
        select: {
          status: true,
        },
      },
      queueEntries: {
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        select: {
          status: true,
          checkedInAt: true,
          consultationStartedAt: true,
          completedAt: true,
        },
      },
    },
  });

  return doctors.map(doctor => {
    const totalAppointments = doctor.appointments.length;
    const completedAppointments = doctor.appointments.filter(
      apt => apt.status === AppointmentStatus.COMPLETED
    ).length;
    const cancelledAppointments = doctor.appointments.filter(
      apt => apt.status === AppointmentStatus.CANCELLED
    ).length;
    const noShowAppointments = doctor.appointments.filter(
      apt => apt.status === AppointmentStatus.NO_SHOW
    ).length;

    const totalPatients = doctor.queueEntries.length;
    const completedConsultations = doctor.queueEntries.filter(
      qe => qe.status === QueueStatus.COMPLETED
    ).length;

    // Calculate average consultation time
    let totalConsultationTime = 0;
    let consultationCount = 0;
    doctor.queueEntries.forEach(entry => {
      if (entry.consultationStartedAt && entry.completedAt) {
        const time = new Date(entry.completedAt).getTime() - new Date(entry.consultationStartedAt).getTime();
        totalConsultationTime += time;
        consultationCount++;
      }
    });
    const avgConsultationTime = consultationCount > 0 
      ? Math.round(totalConsultationTime / consultationCount / 1000 / 60) 
      : 0;

    return {
      doctorId: doctor.id,
      name: `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`,
      specialization: doctor.specialization,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      noShowAppointments,
      totalPatients,
      completedConsultations,
      avgConsultationTime,
      completionRate: totalAppointments > 0 
        ? Math.round((completedAppointments / totalAppointments) * 100) 
        : 0,
    };
  });
};

export const getRecentActivity = async (clinicId: string, userId: string, role: string, limit: number = 10) => {
  const activities: any[] = [];

  if (role === Role.PATIENT) {
    // Get patient's recent appointments
    const patient = await prisma.patient.findUnique({
      where: { userId },
    });

    if (patient) {
      const appointments = await prisma.appointment.findMany({
        where: {
          patientId: patient.id,
          clinicId,
        },
        orderBy: {
          scheduledDate: 'desc',
        },
        take: limit,
        include: {
          doctor: {
            include: {
              user: true,
            },
          },
        },
      });

      appointments.forEach(apt => {
        activities.push({
          type: 'appointment',
          title: `Appointment with Dr. ${apt.doctor.user.firstName} ${apt.doctor.user.lastName}`,
          description: `${apt.appointmentType} - ${apt.status}`,
          date: apt.scheduledDate,
          status: apt.status,
        });
      });
    }
  } else if (role === Role.DOCTOR) {
    // Get doctor's recent consultations
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
    });

    if (doctor) {
      const queueEntries = await prisma.queueEntry.findMany({
        where: {
          doctorId: doctor.id,
          clinicId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        include: {
          patient: {
            include: {
              user: true,
            },
          },
        },
      });

      queueEntries.forEach(qe => {
        activities.push({
          type: 'consultation',
          title: `Consultation with ${qe.patient.user.firstName} ${qe.patient.user.lastName}`,
          description: `Queue #${qe.queueNumber} - ${qe.status}`,
          date: qe.createdAt,
          status: qe.status,
        });
      });
    }
  } else {
    // For admin/receptionist, show clinic-wide activity
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit / 2,
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
    });

    appointments.forEach(apt => {
      activities.push({
        type: 'appointment',
        title: `${apt.patient.user.firstName} ${apt.patient.user.lastName} → Dr. ${apt.doctor.user.firstName} ${apt.doctor.user.lastName}`,
        description: `${apt.appointmentType} - ${apt.status}`,
        date: apt.createdAt,
        status: apt.status,
      });
    });
  }

  return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
};

export const getPatientStats = async (patientUserId: string, clinicId: string) => {
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUserId },
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  const totalAppointments = await prisma.appointment.count({
    where: {
      patientId: patient.id,
      clinicId,
    },
  });

  const completedAppointments = await prisma.appointment.count({
    where: {
      patientId: patient.id,
      clinicId,
      status: AppointmentStatus.COMPLETED,
    },
  });

  const upcomingAppointments = await prisma.appointment.count({
    where: {
      patientId: patient.id,
      clinicId,
      status: AppointmentStatus.SCHEDULED,
      scheduledDate: {
        gte: new Date(),
      },
    },
  });

  const lastVisit = await prisma.appointment.findFirst({
    where: {
      patientId: patient.id,
      clinicId,
      status: AppointmentStatus.COMPLETED,
    },
    orderBy: {
      scheduledDate: 'desc',
    },
    select: {
      scheduledDate: true,
    },
  });

  return {
    totalAppointments,
    completedAppointments,
    upcomingAppointments,
    lastVisit: lastVisit?.scheduledDate || null,
  };
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
