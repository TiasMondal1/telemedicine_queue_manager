import request from 'supertest';
import { app } from '../server';
import { prisma } from '../config/database';

describe('Appointments API', () => {
  let authToken: string;
  let userId: string;
  let doctorId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `patient${Date.now()}@example.com`,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'Patient',
        phone: '+1234567890',
        role: 'PATIENT',
      });

    authToken = registerResponse.body.data.tokens.accessToken;
    userId = registerResponse.body.data.user.id;

    // Get a doctor for testing
    const doctors = await prisma.doctor.findFirst();
    if (doctors) {
      doctorId = doctors.id;
    }
  });

  describe('GET /api/doctors', () => {
    it('should return list of doctors', async () => {
      const response = await request(app)
        .get('/api/doctors')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.doctors)).toBe(true);
    });
  });

  describe('POST /api/appointments', () => {
    it('should create a new appointment', async () => {
      if (!doctorId) {
        console.log('No doctor available, skipping test');
        return;
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          doctorId,
          scheduledDate: tomorrow.toISOString().split('T')[0],
          scheduledTime: '14:00',
          appointmentType: 'VIDEO',
          reason: 'Test appointment',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('appointment');
    });

    it('should reject appointment without required fields', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          doctorId,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/appointments/my-appointments', () => {
    it('should return user appointments', async () => {
      const response = await request(app)
        .get('/api/appointments/my-appointments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.appointments)).toBe(true);
    });
  });
});
