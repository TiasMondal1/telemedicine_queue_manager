# 🏥 Telemedicine Queue Manager

A comprehensive full-stack SaaS telemedicine queue management system with real-time features, video consultations, and multi-platform support.

## 📦 Tech Stack

### Backend
- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL 15+ with Prisma ORM
- **Real-time:** Socket.io
- **Caching:** Redis
- **Job Queue:** Bull
- **Authentication:** JWT with refresh tokens
- **Notifications:** Twilio (SMS), SendGrid (Email), Firebase (Push)
- **Video:** Agora SDK
- **Payments:** Stripe
- **Storage:** AWS S3

### Web Frontend
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + Shadcn/ui
- **Routing:** React Router v6
- **State Management:** Zustand + React Query
- **Forms:** React Hook Form + Zod
- **Real-time:** Socket.io-client
- **Charts:** Recharts

### Mobile Apps
- **Framework:** React Native with TypeScript
- **Platform:** Expo (managed workflow)
- **Navigation:** React Navigation v6
- **UI Library:** React Native Paper
- **State Management:** Zustand + React Query
- **Authentication:** Expo Secure Store + Biometrics
- **Video:** Agora React Native SDK

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis (or use Docker)

### 1. Clone and Setup

```bash
# Navigate to project directory
cd telemedicine_queue_manager

# Start databases with Docker
docker-compose up -d postgres redis

# Setup Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials

# Run Prisma migrations
npm run prisma:migrate
npm run prisma:generate

# Seed database (optional)
npm run prisma:seed

# Start backend development server
npm run dev

# Setup Web Frontend (in new terminal)
cd ../web
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev

# Setup Mobile App (in new terminal)
cd ../mobile
npm install
cp .env.example .env
# Edit .env with your configuration
npx expo start
```

### 2. Access the Application

- **Backend API:** http://localhost:5000
- **Web App:** http://localhost:5173
- **Database Admin (Adminer):** http://localhost:8080
- **Redis Commander:** http://localhost:8081
- **Mobile App:** Scan QR code with Expo Go app

### 3. Default Test Accounts

After seeding, you can use:

```
Admin:
Email: admin@example.com
Password: admin123

Doctor:
Email: doctor@example.com
Password: doctor123

Patient:
Email: patient@example.com
Password: patient123
```

## 📁 Project Structure

```
telemedicine-queue-manager/
├── backend/                 # Express API
│   ├── src/
│   │   ├── config/         # Database, Redis, Socket config
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth, validation
│   │   ├── models/         # Prisma client
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── sockets/        # Socket.io handlers
│   │   ├── jobs/           # Bull background jobs
│   │   └── server.ts       # Entry point
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   ├── migrations/     # Database migrations
│   │   └── seed.ts         # Seed data
│   └── package.json
│
├── web/                    # React web application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── store/          # Zustand state stores
│   │   ├── services/       # API/Socket clients
│   │   ├── utils/          # Helper functions
│   │   ├── lib/            # UI component utilities
│   │   └── App.tsx         # Root component
│   └── package.json
│
├── mobile/                 # React Native application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── screens/        # Screen components
│   │   ├── navigation/     # Navigation config
│   │   ├── hooks/          # Custom hooks
│   │   ├── store/          # Zustand stores
│   │   ├── services/       # API/Socket clients
│   │   └── App.tsx         # Entry point
│   ├── app.json            # Expo configuration
│   ├── eas.json            # EAS Build configuration
│   └── package.json
│
├── shared/                 # Shared TypeScript types
│   └── types/
│
└── docker-compose.yml      # Docker services
```

## 🔑 Key Features

### Phase 1: Authentication ✅
- JWT-based authentication with refresh tokens
- Role-based access control (Admin, Doctor, Receptionist, Patient)
- Biometric authentication (mobile)
- Email verification and password reset

### Phase 2: Appointment Booking ✅
- Doctor schedule management
- Available slot calculation
- Real-time slot booking
- Appointment cancellation/rescheduling
- Queue number generation

### Phase 3: Queue Management ✅
- Real-time queue updates via Socket.io
- Multi-doctor queue dashboard
- Patient check-in system
- Automatic wait time calculation
- Call next patient functionality

### Phase 4: Video Consultations ✅
- Agora video integration
- Room token generation
- In-call controls (mute, video, screen share)
- Session recording
- Mobile and web support

### Phase 5: Notifications ✅
- Multi-channel notifications (SMS, Email, Push, WhatsApp)
- Automated appointment reminders (24h, 1h before)
- Queue position updates
- Scheduled notification system

### Phase 6: User Portals ✅
- Patient dashboard and medical records
- Doctor consultation interface
- Receptionist queue management
- Admin analytics and settings

### Phase 7: Analytics & Reporting ✅
- Daily clinic analytics
- Revenue reports
- Doctor performance metrics
- Peak hours analysis
- Exportable reports

### Phase 8: Payment Integration ✅
- Stripe payment processing
- Prepaid and pay-on-visit options
- Automatic refunds
- Invoice generation

### Phase 9: Advanced Features 🔄
- Smart wait time prediction (ML)
- Multi-language support
- Nearby clinics with maps
- Prescription OCR
- Emergency mode
- In-app chat

## 🗄️ Database Schema

The system uses 13 interconnected models:

1. **Clinic** - Multi-tenant clinic management
2. **User** - User authentication and profiles
3. **DeviceToken** - Push notification device management
4. **Doctor** - Doctor profiles and settings
5. **Patient** - Patient medical information
6. **Appointment** - Appointment records
7. **QueueEntry** - Real-time queue management
8. **Schedule** - Doctor weekly schedules
9. **BlockedDate** - Doctor vacation/blocked dates
10. **Notification** - Notification history
11. **VideoSession** - Video consultation sessions
12. **ClinicSettings** - Clinic configuration
13. **ClinicAnalytics** - Daily aggregated analytics

See `backend/prisma/schema.prisma` for full schema details.

## 🔒 Security

- Bcrypt password hashing (10+ salt rounds)
- JWT with short expiry (15 min access, 7 day refresh)
- Rate limiting on sensitive endpoints
- Helmet.js security headers
- Input validation with Zod
- SQL injection prevention via Prisma
- XSS protection
- CORS configuration
- Secure token storage (httpOnly cookies/SecureStore)

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Web tests
cd web
npm run test

# Mobile tests
cd mobile
npm test
```

## 🚀 Deployment

### Backend (Railway/Render)
1. Connect GitHub repository
2. Add environment variables
3. Enable auto-deploy
4. Configure custom domain

### Web (Vercel)
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables
5. Deploy

### Mobile (EAS)
```bash
# iOS
eas build --platform ios --profile production
eas submit --platform ios

# Android
eas build --platform android --profile production
eas submit --platform android
```

## 📚 API Documentation

API documentation is available at `/api/docs` when running the backend in development mode.

## 🤝 Contributing

This is a proprietary project. Please contact the repository owner for contribution guidelines.

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For support, email support@yourapp.com or contact your system administrator.

## 🎯 Roadmap

- [ ] Phase 10: Testing & QA
- [ ] Phase 11: Production Deployment
- [ ] ML-based wait time prediction
- [ ] Wearable device integration
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] WhatsApp bot integration

---

Built with ❤️ for better healthcare management
