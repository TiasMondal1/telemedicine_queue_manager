import { PrismaClient, Role, SubscriptionTier, Gender } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create a demo clinic
  const clinic = await prisma.clinic.create({
    data: {
      name: 'HealthCare Plus Clinic',
      address: '123 Medical Avenue',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
      phone: '+1-555-0100',
      email: 'contact@healthcareplus.com',
      subscriptionTier: SubscriptionTier.PREMIUM,
      timezone: 'America/New_York',
      businessHours: {
        monday: { open: '09:00', close: '17:00' },
        tuesday: { open: '09:00', close: '17:00' },
        wednesday: { open: '09:00', close: '17:00' },
        thursday: { open: '09:00', close: '17:00' },
        friday: { open: '09:00', close: '17:00' },
        saturday: { open: '09:00', close: '13:00' },
      },
      latitude: 40.7128,
      longitude: -74.0060,
      maxDoctors: 10,
      maxPatientsPerDay: 100,
      isActive: true,
    },
  });

  console.log('✅ Created clinic:', clinic.name);

  // Create clinic settings
  await prisma.clinicSettings.create({
    data: {
      clinicId: clinic.id,
      autoReminderEnabled: true,
      reminderHoursBefore24h: 24,
      reminderHoursBefore1h: 1,
      queueRefreshIntervalSeconds: 30,
      allowWalkIns: true,
      maxWalkInsPerDay: 20,
      videoConsultationPriceMultiplier: 1.5,
      cancellationWindowHours: 24,
      enableSmsNotifications: true,
      enableEmailNotifications: true,
      enablePushNotifications: true,
      enableWhatsappNotifications: false,
      defaultLanguage: 'en',
    },
  });

  console.log('✅ Created clinic settings');

  // Hash passwords
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@healthcareplus.com',
      passwordHash: hashedPassword,
      role: Role.ADMIN,
      clinicId: clinic.id,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1-555-0101',
      emailVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create receptionist user
  const receptionistUser = await prisma.user.create({
    data: {
      email: 'receptionist@healthcareplus.com',
      passwordHash: hashedPassword,
      role: Role.RECEPTIONIST,
      clinicId: clinic.id,
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '+1-555-0102',
      emailVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Created receptionist user:', receptionistUser.email);

  // Create doctor user
  const doctorUser = await prisma.user.create({
    data: {
      email: 'dr.smith@healthcareplus.com',
      passwordHash: hashedPassword,
      role: Role.DOCTOR,
      clinicId: clinic.id,
      firstName: 'John',
      lastName: 'Smith',
      phone: '+1-555-0103',
      emailVerified: true,
      isActive: true,
    },
  });

  // Create doctor profile
  const doctor = await prisma.doctor.create({
    data: {
      userId: doctorUser.id,
      clinicId: clinic.id,
      specialization: 'General Medicine',
      licenseNumber: 'MD123456',
      consultationFee: 100,
      availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      slotDurationMinutes: 15,
      maxPatientsPerDay: 20,
      videoConsultationEnabled: true,
      bio: 'Board-certified physician with 15 years of experience in general medicine.',
      education: 'MD from Harvard Medical School',
      experienceYears: 15,
      rating: 4.8,
      totalRatings: 150,
      isAcceptingAppointments: true,
    },
  });

  console.log('✅ Created doctor:', doctorUser.firstName, doctorUser.lastName);

  // Create doctor schedule
  const daysOfWeek = [1, 2, 3, 4, 5]; // Monday to Friday
  for (const day of daysOfWeek) {
    await prisma.schedule.create({
      data: {
        doctorId: doctor.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        breakStartTime: '12:00',
        breakEndTime: '13:00',
        isActive: true,
      },
    });
  }

  console.log('✅ Created doctor schedules');

  // Create another doctor
  const doctorUser2 = await prisma.user.create({
    data: {
      email: 'dr.williams@healthcareplus.com',
      passwordHash: hashedPassword,
      role: Role.DOCTOR,
      clinicId: clinic.id,
      firstName: 'Emily',
      lastName: 'Williams',
      phone: '+1-555-0104',
      emailVerified: true,
      isActive: true,
    },
  });

  const doctor2 = await prisma.doctor.create({
    data: {
      userId: doctorUser2.id,
      clinicId: clinic.id,
      specialization: 'Pediatrics',
      licenseNumber: 'MD789012',
      consultationFee: 120,
      availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      slotDurationMinutes: 20,
      maxPatientsPerDay: 15,
      videoConsultationEnabled: true,
      bio: 'Specialized in pediatric care with focus on preventive medicine.',
      education: 'MD from Johns Hopkins University',
      experienceYears: 10,
      rating: 4.9,
      totalRatings: 200,
      isAcceptingAppointments: true,
    },
  });

  console.log('✅ Created second doctor:', doctorUser2.firstName, doctorUser2.lastName);

  // Create patient users
  const patientUser1 = await prisma.user.create({
    data: {
      email: 'patient1@example.com',
      passwordHash: hashedPassword,
      role: Role.PATIENT,
      clinicId: clinic.id,
      firstName: 'Michael',
      lastName: 'Brown',
      phone: '+1-555-0201',
      emailVerified: true,
      isActive: true,
    },
  });

  await prisma.patient.create({
    data: {
      userId: patientUser1.id,
      clinicId: clinic.id,
      dateOfBirth: new Date('1985-05-15'),
      gender: Gender.MALE,
      bloodGroup: 'O+',
      allergies: ['Penicillin'],
      medicalHistory: {
        conditions: ['Hypertension'],
        medications: ['Lisinopril 10mg'],
      },
      emergencyContactName: 'Jane Brown',
      emergencyContactPhone: '+1-555-0301',
    },
  });

  console.log('✅ Created patient 1:', patientUser1.email);

  const patientUser2 = await prisma.user.create({
    data: {
      email: 'patient2@example.com',
      passwordHash: hashedPassword,
      role: Role.PATIENT,
      clinicId: clinic.id,
      firstName: 'Lisa',
      lastName: 'Davis',
      phone: '+1-555-0202',
      emailVerified: true,
      isActive: true,
    },
  });

  await prisma.patient.create({
    data: {
      userId: patientUser2.id,
      clinicId: clinic.id,
      dateOfBirth: new Date('1990-08-22'),
      gender: Gender.FEMALE,
      bloodGroup: 'A+',
      allergies: [],
      medicalHistory: {
        conditions: [],
        medications: [],
      },
      emergencyContactName: 'Robert Davis',
      emergencyContactPhone: '+1-555-0302',
    },
  });

  console.log('✅ Created patient 2:', patientUser2.email);

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:');
  console.log('  Email: admin@healthcareplus.com');
  console.log('  Password: password123');
  console.log('\nReceptionist:');
  console.log('  Email: receptionist@healthcareplus.com');
  console.log('  Password: password123');
  console.log('\nDoctors:');
  console.log('  Email: dr.smith@healthcareplus.com');
  console.log('  Password: password123');
  console.log('  Email: dr.williams@healthcareplus.com');
  console.log('  Password: password123');
  console.log('\nPatients:');
  console.log('  Email: patient1@example.com');
  console.log('  Password: password123');
  console.log('  Email: patient2@example.com');
  console.log('  Password: password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
