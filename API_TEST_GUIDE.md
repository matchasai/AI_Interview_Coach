# AI Interview Coach - Authentication API Test Guide

## Setup

Before testing, ensure your `.env` file has these variables configured:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/ai-interview-coach

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5174

# Frontend
FRONTEND_URL=http://localhost:5173

# Email (for development, can use console output)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@ainterviewcoach.com
```

## Test Endpoints

### 1. Register User
**POST** `/api/auth/register`

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

**Development Mode:** Check the console/logs for the verification link format.

---

### 2. Verify Email
**POST** `/api/auth/verify-email`

Body:
```json
{
  "token": "the_verification_token_from_email"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

### 3. Login User (Before Email Verification)
**POST** `/api/auth/login`

```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Expected Response (403):**
```json
{
  "success": false,
  "error": "Please verify your email before logging in",
  "code": "EMAIL_NOT_VERIFIED"
}
```

---

### 4. Login User (After Email Verification)
**POST** `/api/auth/login`

```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

### 5. Get Current User
**GET** `/api/auth/me`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "totalSessions": 0,
    "avgScore": 0
  }
}
```

---

### 6. Resend Verification Email
**POST** `/api/auth/resend-verification-email`

```json
{
  "email": "john@example.com"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Verification link sent to your email"
}
```

---

### 7. Request Password Reset
**POST** `/api/auth/forgot-password`

```json
{
  "email": "john@example.com"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "If an account exists, a reset link has been sent to your email."
}
```

**Note:** This always returns success for security (doesn't leak if email exists).

---

### 8. Reset Password
**POST** `/api/auth/reset-password`

```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePassword456"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful",
  "token": "new_jwt_token...",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

## Testing Workflow

1. **Register** a new user → Check console for verification link
2. **Extract token** from the link (format: `/verify-email/{token}`)
3. **Verify email** using the token
4. **Try login** before verification → Should fail with EMAIL_NOT_VERIFIED
5. **Verify email** → Should succeed
6. **Login** → Should succeed and return JWT token
7. **Get /me** with JWT → Should return user profile
8. **Test forgot-password** → Should always return success
9. **Create new password** with reset token

## Error Responses

### Invalid Email Format
**Status:** 400
```json
{
  "success": false,
  "error": "Invalid email",
  "code": "VALIDATION_ERROR"
}
```

### Password Too Short
**Status:** 400
```json
{
  "success": false,
  "error": "Password must be at least 8 characters",
  "code": "VALIDATION_ERROR"
}
```

### Email Already Registered
**Status:** 409
```json
{
  "success": false,
  "error": "Email already registered",
  "code": "EMAIL_EXISTS"
}
```

### Invalid/Expired Token
**Status:** 400
```json
{
  "success": false,
  "error": "Invalid or expired verification token",
  "code": "INVALID_TOKEN"
}
```

## Development Tips

1. **SMTP not configured?** Check console logs for verification links
2. **Email verification token expired?** Use resend-verification-email endpoint
3. **Forgot password token expired?** The token is valid for 1 hour
4. **Email verification token?** Valid for 24 hours
5. **Monitor logs** for email service status and errors

## Postman Collection

Import these as a Postman collection for easier testing:

```
Base URL: http://localhost:5000/api
```

All requests should set `Content-Type: application/json`

---

## Backend Server Startup

```bash
npm install
npm start
```

Server should be running on `http://localhost:5000`
