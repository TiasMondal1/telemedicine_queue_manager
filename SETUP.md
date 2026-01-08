# Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **Git**
- **PostgreSQL** 15+ (optional if using Docker)
- **Redis** (optional if using Docker)

For mobile development:
- **Expo CLI**: `npm install -g expo-cli`
- **iOS**: Xcode (Mac only) or Expo Go app
- **Android**: Android Studio or Expo Go app

## Step-by-Step Setup

### 1. Database Setup

#### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Check if services are running
docker ps
```

#### Option B: Local Installation

Install PostgreSQL and Redis locally and ensure they're running on default ports:
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env file with your credentials
# At minimum, update:
# - DATABASE_URL
# - JWT_SECRET
# - JWT_REFRESH_SECRET

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed the database with test data
npm run prisma:seed

# Start development server
npm run dev
```

The backend should now be running on `http://localhost:5000`

### 3. Web Frontend Setup

```bash
cd web

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env file
# Update VITE_API_URL if backend is not on localhost:5000

# Start development server
npm run dev
```

The web app should now be running on `http://localhost:5173`

### 4. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env file with your backend URL
# For local development, use your machine's IP address, not localhost

# Start Expo development server
npx expo start
```

Scan the QR code with:
- iOS: Camera app (will open Expo Go)
- Android: Expo Go app

### 5. Third-Party Services Setup

#### Required Services:

1. **Twilio** (SMS notifications)
   - Sign up at https://www.twilio.com
   - Get Account SID, Auth Token, and Phone Number
   - Add to `backend/.env`

2. **SendGrid** (Email notifications)
   - Sign up at https://sendgrid.com
   - Create API key
   - Add to `backend/.env`

3. **Firebase** (Push notifications)
   - Create project at https://console.firebase.google.com
   - Download service account key
   - Add credentials to `backend/.env`

4. **Agora** (Video consultations)
   - Sign up at https://www.agora.io
   - Create project and get App ID
   - Add to `backend/.env` and `web/.env`/`mobile/.env`

5. **Stripe** (Payments)
   - Sign up at https://stripe.com
   - Get API keys from dashboard
   - Add to `backend/.env` and `web/.env`/`mobile/.env`

#### Optional Services:

- **AWS S3** (File storage) or use Cloudinary
- **Google Cloud Vision** (OCR for prescriptions)

### 6. Verify Installation

1. **Backend Health Check**
   ```bash
   curl http://localhost:5000/health
   # Should return: {"status":"ok"}
   ```

2. **Database Check**
   ```bash
   cd backend
   npm run prisma:studio
   # Opens Prisma Studio at http://localhost:5555
   ```

3. **Test Login**
   - Open web app: http://localhost:5173
   - Login with test credentials:
     ```
     Email: admin@healthcareplus.com
     Password: password123
     ```

### 7. Development Tools

#### Useful Docker Commands

```bash
# View logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Stop services
docker-compose stop

# Remove containers and volumes
docker-compose down -v
```

#### Database Management

```bash
# Open Prisma Studio
npm run prisma:studio

# Create new migration
npm run prisma:migrate -- --name migration_name

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset
```

#### Access Management UIs

- **Adminer** (Database): http://localhost:8080
  - System: PostgreSQL
  - Server: postgres
  - Username: postgres
  - Password: postgres
  - Database: telemedicine_db

- **Redis Commander**: http://localhost:8081

## Troubleshooting

### Backend won't start

1. Check if PostgreSQL is running:
   ```bash
   docker ps | grep postgres
   ```

2. Verify DATABASE_URL in `.env`

3. Check for port conflicts (5000)

### Prisma migration errors

```bash
# Reset and recreate
npx prisma migrate reset
npm run prisma:generate
npm run prisma:seed
```

### Mobile app won't connect to backend

1. Use your machine's IP address, not `localhost`
   ```bash
   # Find your IP
   # Mac/Linux:
   ifconfig | grep inet
   # Windows:
   ipconfig
   ```

2. Update `mobile/.env`:
   ```
   API_URL=http://192.168.1.xxx:5000/api
   ```

3. Ensure firewall allows connections on port 5000

### Web app API errors

1. Check CORS settings in `backend/src/server.ts`
2. Verify `VITE_API_URL` in `web/.env`
3. Check browser console for errors

## Next Steps

1. Read the main [README.md](README.md) for architecture overview
2. Explore the API documentation at `/api/docs` (when implemented)
3. Review test credentials in seed output
4. Start developing your features!

## Environment-Specific Setup

### Production Setup

See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment instructions.

### Testing Setup

```bash
# Backend tests
cd backend
npm test

# Web tests
cd web
npm run test
```

## Support

If you encounter issues:
1. Check the error logs
2. Verify all environment variables are set
3. Ensure all services are running
4. Check the troubleshooting section above

For additional help, contact your development team.
