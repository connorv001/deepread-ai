import { NextRequest, NextResponse } from 'next/server';

// Mark this route as dynamic since it clears cookies
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const COOKIE_NAME = 'deepread_token';
const isProduction = process.env.NODE_ENV === 'production';

export async function POST(request: NextRequest) {
  try {
    // Get the token from the cookie to forward to backend
    const token = request.cookies.get(COOKIE_NAME)?.value;
    
    // Forward to backend
    const response = await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Cookie': `${COOKIE_NAME}=${token}` }),
      },
      credentials: 'include',
    });

    // Create response
    const nextResponse = NextResponse.json({
      status: 'success',
      message: 'Logged out successfully'
    });
    
    // Clear the cookie
    nextResponse.cookies.set({
      name: COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 0,
      path: '/',
    });

    return nextResponse;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if backend fails, clear the local cookie
    const nextResponse = NextResponse.json({
      status: 'success',
      message: 'Logged out successfully'
    });
    
    nextResponse.cookies.set({
      name: COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 0,
      path: '/',
    });

    return nextResponse;
  }
}
