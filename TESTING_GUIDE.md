# 🧪 Testing Guide - Telemedicine Queue Manager

## Overview

This guide covers all testing strategies and procedures for the Telemedicine Queue Manager platform.

---

## 📋 Testing Stack

### Backend Testing
- **Framework**: Jest
- **API Testing**: Supertest
- **Database**: PostgreSQL (test database)
- **Coverage**: Jest coverage reports

### Frontend Testing
- **Framework**: Vitest
- **Component Testing**: React Testing Library
- **Coverage**: Vitest coverage

### E2E Testing
- **Framework**: Cypress (optional)
- **Scope**: Critical user flows

### CI/CD
- **Platform**: GitHub Actions
- **Services**: PostgreSQL, Redis
- **Coverage**: Codecov integration

---

## 🚀 Running Tests

### Backend Tests

```bash
# Navigate to backend
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.ts
```

### Web Tests

```bash
# Navigate to web
cd web

# Run all tests
npm test

# Run tests in watch mode  
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test
npm test -- StatCard.test.tsx
```

### Mobile Tests

```bash
# Navigate to mobile
cd mobile

# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage
```

---

## 📝 Test Structure

### Backend Test Structure

```
backend/src/__tests__/
├── auth.test.ts           # Authentication tests
├── appointments.test.ts   # Appointment API tests
├── queue.test.ts          # Queue management tests
├── payments.test.ts       # Payment integration tests
└── prescriptions.test.ts  # Prescription tests
```

### Frontend Test Structure

```
web/src/__tests__/
├── setup.ts              # Test setup & configuration
├── components/
│   ├── StatCard.test.tsx # Component tests
│   ├── Button.test.tsx
│   └── ...
└── pages/
    ├── Login.test.tsx    # Page tests
    └── ...
```

---

## 🧪 Test Examples

### Backend API Test

```typescript
describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890',
        role: 'PATIENT',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('user');
  });
});
```

### Frontend Component Test

```typescript
describe('StatCard Component', () => {
  it('renders title and value', () => {
    render(
      <StatCard
        title="Total Appointments"
        value={45}
        icon={Calendar}
      />
    );

    expect(screen.getByText('Total Appointments')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });
});
```

---

## 🎯 Test Coverage Goals

### Minimum Coverage Targets
- **Overall**: 70%+
- **Critical Paths**: 90%+
- **Authentication**: 95%+
- **Payment Processing**: 95%+

### Current Coverage
- Backend: Run `npm test -- --coverage` to check
- Web: Run `npm test -- --coverage` to check

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

**Triggered on**:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

**Jobs**:
1. **Backend Tests** - Run Jest tests with PostgreSQL & Redis
2. **Web Tests** - Run Vitest tests
3. **Mobile Tests** - Run Jest tests
4. **Lint & Type Check** - Verify code quality

**Services**:
- PostgreSQL 15
- Redis 7

---

## 📊 Coverage Reports

### Viewing Coverage Reports

**Backend**:
```bash
cd backend
npm test -- --coverage
# Open coverage/index.html in browser
```

**Web**:
```bash
cd web
npm test -- --coverage
# Open coverage/index.html in browser
```

### Coverage Metrics

Coverage reports include:
- **Statements**: % of code statements executed
- **Branches**: % of conditional branches tested
- **Functions**: % of functions called
- **Lines**: % of code lines executed

---

## 🧪 Manual Testing Checklist

### Authentication Flow
- [ ] Register new user
- [ ] Login with valid credentials
- [ ] Login fails with invalid password
- [ ] Refresh token works
- [ ] Logout clears session

### Appointment Flow
- [ ] Book appointment
- [ ] View appointments
- [ ] Cancel appointment
- [ ] Reschedule appointment
- [ ] Payment flow works

### Queue Management
- [ ] Patient checks in
- [ ] Queue position updates in real-time
- [ ] Doctor calls next patient
- [ ] Complete consultation

### Video Consultation
- [ ] Start video call
- [ ] Join video call
- [ ] Mute/unmute audio
- [ ] Turn camera on/off
- [ ] End call

### Notifications
- [ ] Email notifications sent
- [ ] Push notifications work
- [ ] SMS notifications (if configured)
- [ ] 24-hour reminder
- [ ] 1-hour reminder

### Payment System
- [ ] Create payment intent
- [ ] Complete payment with test card
- [ ] Invoice generated
- [ ] Payment history visible
- [ ] Refund processes

### Reports
- [ ] Generate appointment report
- [ ] Download PDF
- [ ] Download CSV
- [ ] All report types work

### Prescriptions
- [ ] Doctor creates prescription
- [ ] Patient views prescription
- [ ] Prescription details correct

### Settings
- [ ] Admin updates settings
- [ ] Notification toggles work
- [ ] Settings persist after save

---

## 🐛 Debugging Tests

### Common Issues

**Database Connection Errors**:
```bash
# Ensure PostgreSQL is running
# Check DATABASE_URL in .env
```

**Redis Connection Errors**:
```bash
# Ensure Redis is running
redis-cli ping
```

**Test Timeouts**:
```javascript
// Increase timeout in test
it('slow test', async () => {
  // ...
}, 10000); // 10 second timeout
```

---

## 📈 Best Practices

### Writing Good Tests

1. **Clear Names**: Test names should describe what they test
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Independent**: Tests should not depend on each other
4. **Fast**: Keep tests fast to run frequently
5. **Isolated**: Use mocks for external dependencies

### Test Organization

```typescript
describe('Feature Name', () => {
  describe('Specific Functionality', () => {
    beforeAll(() => {
      // Setup
    });

    afterAll(() => {
      // Cleanup
    });

    it('should do something specific', () => {
      // Test
    });
  });
});
```

---

## 🔒 Testing Security

### Authentication Tests
- Test invalid credentials
- Test expired tokens
- Test unauthorized access
- Test RBAC permissions

### Data Validation Tests
- Test SQL injection prevention
- Test XSS prevention
- Test input validation
- Test file upload restrictions

---

## 📱 Mobile Testing

### React Native Testing

```bash
# Run mobile tests
cd mobile
npm test

# Run with coverage
npm test -- --coverage
```

### Testing Components

```typescript
import { render } from '@testing-library/react-native';

describe('LoginScreen', () => {
  it('renders correctly', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Login')).toBeTruthy();
  });
});
```

---

## 🎯 Next Steps

### Phase 10 Completion Checklist
- [x] Set up Jest for backend
- [x] Set up Vitest for web
- [x] Create sample tests
- [x] Set up CI/CD pipeline
- [x] Add coverage reporting
- [ ] Write more comprehensive tests
- [ ] Add E2E tests (optional)
- [ ] Achieve 70%+ coverage

### Phase 11: Deployment
After testing is complete, move to deployment:
- Docker containers
- Cloud deployment
- Production configs
- Monitoring setup

---

## 📚 Resources

### Documentation
- [Jest Docs](https://jestjs.io/)
- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest](https://github.com/visionmedia/supertest)

### Commands Reference

```bash
# Backend
npm test                    # Run all tests
npm test -- --coverage      # With coverage
npm test -- --watch         # Watch mode

# Web
npm test                    # Run all tests
npm test -- --coverage      # With coverage
npm test -- --watch         # Watch mode

# CI/CD
git push origin main        # Triggers CI pipeline
```

---

## ✅ Testing Checklist

### Backend Tests
- [x] Authentication API
- [x] Appointments API
- [ ] Queue API
- [ ] Payment API
- [ ] Prescriptions API
- [ ] Analytics API

### Frontend Tests
- [x] StatCard Component
- [ ] Button Component
- [ ] Login Page
- [ ] Dashboard Page
- [ ] Appointment Booking

### Integration Tests
- [ ] End-to-end appointment flow
- [ ] Payment flow
- [ ] Video call flow

### CI/CD
- [x] GitHub Actions setup
- [x] PostgreSQL service
- [x] Redis service
- [x] Test coverage reporting

---

**Testing is critical for production readiness!** 🧪

Run tests frequently and maintain high coverage for a reliable platform. 🎯
