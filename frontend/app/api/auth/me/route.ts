import { NextRequest, NextResponse } from 'next/server';

// Mark this route as dynamic since it uses cookies
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const COOKIE_NAME = 'deepread_token';

export async function GET(request: NextRequest) {
  try {
    // Get the token from the cookie
    const token = request.cookies.get(COOKIE_NAME)?.value;
    
    if (!token) {
      return NextResponse.json(
        { status: 'error', message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Forward to backend with the cookie
    const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `${COOKIE_NAME}=${token}`,
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      // Clear invalid cookie
      const nextResponse = NextResponse.json(
        { status: 'error', message: data.message || 'Not authenticated' },
        { status: response.status }
      );
      nextResponse.cookies.set({
        name: COOKIE_NAME,
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 0,
        path: '/',
      });
      return nextResponse;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
