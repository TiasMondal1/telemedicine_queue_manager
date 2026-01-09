# 🚀 Deployment Guide - Telemedicine Queue Manager

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Deployment Options](#deployment-options)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Mobile App Deployment](#mobile-app-deployment)
- [Monitoring & Analytics](#monitoring--analytics)
- [SSL & Domain Setup](#ssl--domain-setup)
- [Troubleshooting](#troubleshooting)

---

## 📦 Prerequisites

### Required Accounts
- [ ] GitHub account (for code hosting & CI/CD)
- [ ] Railway/Render account (for backend)
- [ ] Vercel account (for web app)
- [ ] Expo account (for mobile builds)
- [ ] Domain registrar (for custom domain)
- [ ] Sentry account (for error monitoring - optional)

### Required Services
- [ ] PostgreSQL database (Railway/Render provides)
- [ ] Redis instance (Railway/Render provides)
- [ ] Stripe account (for payments)
- [ ] SendGrid account (for emails)
- [ ] Twilio account (for SMS - optional)
- [ ] Firebase account (for push notifications)
- [ ] Agora account (for video calls)

---

## 🔐 Environment Variables

### Backend (.env.production)
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://host:6379

# Server
NODE_ENV=production
PORT=5000

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# SendGrid (Email)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Twilio (SMS - Optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Agora (Video)
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-certificate

# Sentry (Error Tracking - Optional)
SENTRY_DSN=https://xxxxxxxxxxxxx@sentry.io/xxxxx
```

### Web (.env.production)
```env
VITE_API_URL=https://api.yourdomain.com
VITE_SOCKET_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
VITE_AGORA_APP_ID=your-agora-app-id
```

### Mobile (app.json - extra section)
```json
{
  "extra": {
    "apiUrl": "https://api.yourdomain.com",
    "socketUrl": "https://api.yourdomain.com",
    "agoraAppId": "your-agora-app-id"
  }
}
```

---

## 🐳 Docker Deployment

### 1. Build Docker Images

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Or build individually
docker build -t telemedicine-backend -f backend/Dockerfile.prod backend/
docker build -t telemedicine-web -f web/Dockerfile.prod web/
```

### 2. Run with Docker Compose

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop all services
docker-compose -f docker-compose.prod.yml down
```

### 3. Database Migrations

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Seed database (optional)
docker-compose -f docker-compose.prod.yml exec backend npx prisma db seed
```

---

## ☁️ Cloud Deployment

### Option 1: Railway (Backend + Database)

#### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

#### Step 2: Create New Project
```bash
railway init
railway link
```

#### Step 3: Add Services
```bash
# Add PostgreSQL
railway add postgresql

# Add Redis
railway add redis
```

#### Step 4: Deploy Backend
```bash
cd backend
railway up
```

#### Step 5: Set Environment Variables
```bash
# Via CLI
railway variables set JWT_SECRET=your-secret

# Or via Railway Dashboard
# 1. Go to railway.app
# 2. Select your project
# 3. Go to Variables tab
# 4. Add all environment variables
```

#### Step 6: Run Migrations
```bash
railway run npx prisma migrate deploy
```

---

### Option 2: Vercel (Web App)

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
vercel login
```

#### Step 2: Deploy
```bash
cd web
vercel --prod
```

#### Step 3: Set Environment Variables
```bash
# Via CLI
vercel env add VITE_API_URL production

# Or via Vercel Dashboard
# 1. Go to vercel.com
# 2. Select your project
# 3. Go to Settings → Environment Variables
# 4. Add all VITE_* variables
```

#### Step 4: Configure Domain
```bash
# Add custom domain
vercel domains add yourdomain.com
```

---

### Option 3: Render (Alternative to Railway)

#### Step 1: Create Account
Go to render.com and create account

#### Step 2: New Web Service
1. Click "New +" → "Web Service"
2. Connect GitHub repository
3. Select backend folder
4. Configure:
   - **Name**: telemedicine-backend
   - **Environment**: Node
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `node dist/server.js`
   - **Plan**: Starter ($7/month) or higher

#### Step 3: Add Database
1. Click "New +" → "PostgreSQL"
2. Configure:
   - **Name**: telemedicine-db
   - **Plan**: Starter ($7/month) or higher
3. Copy DATABASE_URL

#### Step 4: Add Redis
1. Click "New +" → "Redis"
2. Configure:
   - **Name**: telemedicine-redis
   - **Plan**: Free or higher
3. Copy REDIS_URL

#### Step 5: Set Environment Variables
In your web service:
1. Go to "Environment" tab
2. Add all environment variables
3. Click "Save Changes"

#### Step 6: Deploy
Render will automatically deploy on git push to main

---

## 📱 Mobile App Deployment

### iOS & Android with EAS Build

#### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

#### Step 2: Configure EAS
```bash
cd mobile
eas build:configure
```

#### Step 3: Build for Android
```bash
# Development build
eas build --platform android --profile development

# Production build
eas build --platform android --profile production
```

#### Step 4: Build for iOS
```bash
# You need Apple Developer account ($99/year)

# Development build
eas build --platform ios --profile development

# Production build
eas build --platform ios --profile production
```

#### Step 5: Submit to Stores

**Google Play Store**:
```bash
eas submit --platform android
```

**Apple App Store**:
```bash
eas submit --platform ios
```

---

## 📊 Monitoring & Analytics

### Sentry (Error Tracking)

#### Step 1: Create Project
1. Go to sentry.io
2. Create account
3. Create new project (Node.js for backend, React for web)
4. Copy DSN

#### Step 2: Install Sentry
```bash
# Backend
cd backend
npm install @sentry/node

# Web
cd web
npm install @sentry/react
```

#### Step 3: Configure

**Backend** (`src/server.ts`):
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

**Web** (`src/main.tsx`):
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

---

### Mixpanel or Amplitude (Analytics)

#### Install
```bash
npm install mixpanel-browser
# or
npm install amplitude-js
```

#### Configure
```typescript
// src/services/analytics.ts
import mixpanel from 'mixpanel-browser';

mixpanel.init('YOUR_PROJECT_TOKEN');

export const trackEvent = (event: string, properties?: object) => {
  mixpanel.track(event, properties);
};
```

---

## 🌐 SSL & Domain Setup

### Step 1: Purchase Domain
- Namecheap, GoDaddy, Google Domains, etc.
- Cost: $10-20/year

### Step 2: Configure DNS

**For Backend (Railway/Render)**:
```
Type: CNAME
Name: api
Value: your-app.railway.app (or render.com)
TTL: 3600
```

**For Web (Vercel)**:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600

Type: A
Name: @
Value: 76.76.21.21 (Vercel IP)
TTL: 3600
```

### Step 3: SSL Certificates
- **Railway/Render/Vercel**: Automatic SSL (Let's Encrypt)
- **Custom**: Use Certbot

---

## 🔍 Health Checks

### Backend Health Endpoint
Add to `backend/src/server.ts`:

```typescript
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
```

Test:
```bash
curl https://api.yourdomain.com/health
```

---

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**:
```bash
# Check DATABASE_URL format
postgresql://username:password@host:port/database

# Test connection
psql $DATABASE_URL
```

**Redis Connection Failed**:
```bash
# Check REDIS_URL format
redis://host:port

# Test connection
redis-cli -u $REDIS_URL ping
```

**Build Failures**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Prisma
npx prisma generate
```

**CORS Errors**:
```typescript
// backend/src/server.ts
app.use(cors({
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  credentials: true,
}));
```

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] SSL certificates configured
- [ ] Health checks implemented
- [ ] Error monitoring setup
- [ ] Backup strategy defined

### During Deployment
- [ ] Run database migrations
- [ ] Seed initial data (if needed)
- [ ] Verify all services running
- [ ] Test API endpoints
- [ ] Test web application
- [ ] Check error logs

### Post-Deployment
- [ ] Verify SSL working
- [ ] Test user registration
- [ ] Test appointment booking
- [ ] Test payment flow
- [ ] Test video calls
- [ ] Monitor error rates
- [ ] Check performance metrics

---

## 🎯 Production URLs

After deployment, your URLs will be:

- **Web App**: https://yourdomain.com
- **API**: https://api.yourdomain.com
- **Admin Panel**: https://yourdomain.com/admin
- **Mobile Apps**: 
  - iOS: App Store
  - Android: Google Play Store

---

## 🚀 Continuous Deployment

### GitHub Actions (Already configured!)

**On every push to main**:
1. Run tests
2. Build Docker images
3. Push to registry
4. Deploy to Railway/Vercel
5. Run migrations
6. Health check

**Manual deployment**:
```bash
git push origin main
# Watch GitHub Actions tab
```

---

## 💰 Estimated Costs

### Minimum Setup (Hobby/Testing)
- Railway Hobby: $5/month
- Vercel Hobby: Free
- Database: Included in Railway
- Redis: Included in Railway
- **Total: ~$5/month**

### Production Setup
- Railway Pro: $20/month
- Vercel Pro: $20/month
- Database: $7/month (Render)
- Redis: $10/month
- Domain: $15/year
- SSL: Free (Let's Encrypt)
- Sentry: Free tier (then $26/month)
- **Total: ~$60-80/month**

---

## 📞 Support

### Deployment Issues
- Railway: https://railway.app/help
- Vercel: https://vercel.com/support
- Render: https://render.com/docs

### Service Issues
- Stripe: https://support.stripe.com
- Twilio: https://support.twilio.com
- SendGrid: https://support.sendgrid.com
- Agora: https://www.agora.io/en/support

---

## 🎊 Congratulations!

Your telemedicine platform is now LIVE! 🚀

**You've deployed**:
- ✅ Backend API (Railway/Render)
- ✅ Web Application (Vercel)
- ✅ PostgreSQL Database
- ✅ Redis Cache
- ✅ SSL Certificates
- ✅ Error Monitoring
- ✅ CI/CD Pipeline

**Next steps**:
1. Test all features in production
2. Set up monitoring dashboards
3. Configure backups
4. Plan marketing strategy
5. Onboard first users!

**YOUR PLATFORM IS LIVE!** 🌍🎉
