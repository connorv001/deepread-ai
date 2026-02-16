# DeepRead AI - BFF Architecture Refactor Complete

## Summary

The DeepRead AI application has been successfully refactored to use a **Backend-for-Frontend (BFF)** pattern with proper cookie-based authentication.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser       │────▶│  Next.js         │────▶│  Backend        │
│   (Frontend)    │◄────│  (BFF Layer)     │◄────│  (Port 3001)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
  ┌─────────┐           ┌────────────┐         ┌──────────────┐
  │/api/auth│           │/api/*      │         │ middleware.ts│
  │routes   │           │proxy       │         │ (protection) │
  └─────────┘           └────────────┘         └──────────────┘
```

## Key Features Implemented

### 1. Next.js API Routes (BFF Layer)
- **`/frontend/app/api/auth/login/route.ts`** - Proxies login to backend, sets httpOnly cookie
- **`/frontend/app/api/auth/register/route.ts`** - Proxies registration to backend, sets httpOnly cookie
- **`/frontend/app/api/auth/logout/route.ts`** - Clears auth cookie
- **`/frontend/app/api/auth/me/route.ts`** - Returns current user from cookie
- **`/frontend/app/api/[...path]/route.ts`** - Proxies ALL other API calls with auth

### 2. Middleware Protection
- **`/frontend/middleware.ts`** - Protects routes and redirects:
  - Unauthenticated users → `/login`
  - Authenticated users on `/login` or `/register` → `/library`
  - Supports redirect parameter for post-login redirection

### 3. Frontend Updates
- **`lib/api.ts`** - All API calls go to `/api/*` (Next.js routes), no token management
- **`lib/store.ts`** - Stores user info only, NO token storage
- **`app/login/page.tsx`** - Calls `/api/auth/login`, handles redirects
- **`app/register/page.tsx`** - Calls `/api/auth/register`
- **`app/library/page.tsx`** - Works with server-side auth validation

### 4. Backend Configuration
- Uses cookie-based auth from `auth-cookies.ts`
- Reads JWT token from httpOnly cookie (not Authorization header)
- CORS configured to allow credentials
- All protected routes use `authMiddleware` from `auth-cookies.ts`

## Security Improvements

1. **httpOnly Cookies** - Tokens are not accessible to JavaScript
2. **No Token Storage** - Frontend never stores or handles JWT tokens
3. **Server-Side Auth Validation** - Middleware checks auth before page render
4. **Secure Cookie Settings** - `secure`, `sameSite`, and `httpOnly` flags

## Running the Application

### Start Backend (Port 3001)
```bash
cd backend
npm run build
npm start
```

### Start Frontend (Port 3090)
```bash
cd frontend
npm run build
PORT=3090 npm start
```

### Run Tests
```bash
./test-bff.sh
```

## Environment Variables

### Frontend (.env.local)
```
BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3090
```

### Backend (.env)
```
PORT=3001
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
# ... other vars
```

## Testing Results

All tests passing:
- ✅ Backend health check
- ✅ Frontend API routes (auth/me, login, register)
- ✅ Cookie-based authentication
- ✅ Middleware protection (redirects unauthenticated users)
- ✅ API proxy to backend
- ✅ End-to-end auth flow (register → login → access → logout)

## API Flow Examples

### Login Flow
```
1. POST /api/auth/login → Next.js API Route
2. Next.js proxies to backend /api/auth/login
3. Backend validates credentials, returns user + sets cookie header
4. Next.js forwards cookie to browser (httpOnly)
5. Browser stores cookie automatically
```

### Protected API Call
```
1. GET /api/library → Next.js API Route
2. Next.js reads cookie from request
3. Next.js proxies to backend with Cookie header
4. Backend validates JWT from cookie
5. Response returned through Next.js to browser
```

## Files Created/Modified

### Created:
- `frontend/app/api/auth/login/route.ts`
- `frontend/app/api/auth/register/route.ts`
- `frontend/app/api/auth/logout/route.ts`
- `frontend/app/api/auth/me/route.ts`
- `frontend/app/api/[...path]/route.ts`
- `frontend/middleware.ts`
- `frontend/.env.local`
- `frontend/.env.development`
- `test-bff.sh`

### Modified:
- `frontend/next.config.js` - Removed rewrites, simplified config
- `frontend/lib/api.ts` - Updated comments, improved error handling
- `frontend/lib/store.ts` - No changes needed (already no token storage)
- `frontend/app/login/page.tsx` - Added redirect support
- `frontend/app/register/page.tsx` - Added loading states
- `frontend/app/library/page.tsx` - Improved auth check
- `backend/src/routes/auth-cookies.ts` - Fixed TypeScript types
- `backend/src/routes/auth.ts` - Fixed TypeScript types

## Production Deployment Notes

1. Set `NODE_ENV=production` in both frontend and backend
2. Use HTTPS in production (cookies will be secure)
3. Update CORS origins in backend to match production domains
4. Set strong `JWT_SECRET` in production
5. Frontend builds static files, run with `npm start`

## Browser Compatibility

- All modern browsers support httpOnly cookies
- fetch API with credentials is supported
- No special requirements

---

**Refactor Complete** ✅
Date: 2026-02-16
Status: Production-ready
