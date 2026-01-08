// Shared TypeScript types for frontend and backend

export enum Role {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  PATIENT = 'PATIENT',
}

export enum AppointmentType {
  IN_PERSON = 'IN_PERSON',
  VIDEO = 'VIDEO',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum QueueStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  IN_CONSULTATION = 'IN_CONSULTATION',
  COMPLETED = 'COMPLETED',
}

export enum SubscriptionTier {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
}

export enum NotificationType {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  WHATSAPP = 'WHATSAPP',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  INSURANCE_PENDING = 'INSURANCE_PENDING',
}

export enum Platform {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
  WEB = 'WEB',
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Authentication Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: Role;
  clinicId?: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  role: Role;
  clinicId: string;
  firstName: string;
  lastName: string;
  phone: string;
  profilePictureUrl?: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  clinic?: Clinic;
  doctor?: Doctor;
  patient?: Patient;
}

// Clinic Types
export interface Clinic {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: string;
  phone: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  timezone: string;
  businessHours?: Record<string, { open: string; close: string }>;
  logoUrl?: string;
  themeSettings?: Record<string, any>;
  maxDoctors: number;
  maxPatientsPerDay: number;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Doctor Types
export interface Doctor {
  id: string;
  userId: string;
  clinicId: string;
  specialization: string;
  licenseNumber: string;
  consultationFee: number;
  availableDays: string[];
  slotDurationMinutes: number;
  maxPatientsPerDay: number;
  videoConsultationEnabled: boolean;
  bio?: string;
  education?: string;
  experienceYears: number;
  rating: number;
  totalRatings: number;
  isAcceptingAppointments: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

// Patient Types
export interface Patient {
  id: string;
  userId: string;
  clinicId: string;
  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: string;
  medicalHistory?: Record<string, any>;
  allergies: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

// Appointment Types
export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  clinicId: string;
  appointmentType: AppointmentType;
  scheduledDate: string;
  scheduledTime: string;
  status: AppointmentStatus;
  queueNumber?: number;
  estimatedWaitMinutes: number;
  actualStartTime?: string;
  actualEndTime?: string;
  consultationNotes?: string;
  prescriptions?: Prescription[];
  diagnosis?: string;
  followUpDate?: string;
  videoRoomId?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  rating?: number;
  feedback?: string;
  paymentStatus: PaymentStatus;
  paymentAmount?: number;
  paymentId?: string;
  isEmergency: boolean;
  createdAt: string;
  updatedAt: string;
  patient?: Patient;
  doctor?: Doctor;
  queueEntry?: QueueEntry;
}

export interface Prescription {
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

// Queue Types
export interface QueueEntry {
  id: string;
  appointmentId: string;
  doctorId: string;
  clinicId: string;
  queuePosition: number;
  arrivalTime: string;
  status: QueueStatus;
  notifiedAt?: string;
  calledAt?: string;
  createdAt: string;
  updatedAt: string;
  appointment?: Appointment;
  doctor?: Doctor;
}

// Schedule Types
export interface Schedule {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  appointmentId?: string;
}

// Video Session Types
export interface VideoSession {
  id: string;
  appointmentId: string;
  clinicId: string;
  roomId: string;
  token?: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  recordingUrl?: string;
  participants?: VideoParticipant[];
  createdAt: string;
}

export interface VideoParticipant {
  userId: string;
  joinedAt: string;
  leftAt?: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  clinicId: string;
  appointmentId?: string;
  type: NotificationType;
  title: string;
  content: string;
  status: NotificationStatus;
  scheduledFor: string;
  sentAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

// Analytics Types
export interface ClinicAnalytics {
  id: string;
  clinicId: string;
  date: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  averageWaitMinutes: number;
  totalRevenue: number;
  newPatients: number;
  videoConsultations: number;
  inPersonConsultations: number;
  createdAt: string;
}

export interface AnalyticsDateRange {
  startDate: string;
  endDate: string;
}

// Socket Event Types
export interface SocketEvents {
  // Queue events
  'queue:updated': (data: QueueEntry[]) => void;
  'queue:position_changed': (data: { appointmentId: string; position: number; estimatedWait: number }) => void;
  'queue:patient_called': (data: { appointmentId: string; patientName: string }) => void;

  // Appointment events
  'appointment:status_changed': (data: { appointmentId: string; status: AppointmentStatus }) => void;
  'appointment:reminder': (data: { appointmentId: string; message: string }) => void;

  // Video events
  'video:call_started': (data: { appointmentId: string; roomId: string }) => void;
  'video:call_ended': (data: { appointmentId: string; duration: number }) => void;

  // Notification events
  'notification:new': (data: Notification) => void;
}
