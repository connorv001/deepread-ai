import { NextRequest, NextResponse } from 'next/server';

// Mark this route as dynamic since it sets cookies
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const COOKIE_NAME = 'deepread_token';
const isProduction = process.env.NODE_ENV === 'production';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward to backend
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { status: 'error', message: data.message || 'Registration failed' },
        { status: response.status }
      );
    }

    // Extract token from Set-Cookie header if backend sets it
    const setCookieHeader = response.headers.get('set-cookie');
    
    // Create response
    const nextResponse = NextResponse.json(data);
    
    // If backend set cookie, forward it
    if (setCookieHeader) {
      nextResponse.headers.set('Set-Cookie', setCookieHeader);
    }
    
    // Also set cookie in Next.js layer
    if (data.data?.token || setCookieHeader) {
      const token = data.data?.token || extractTokenFromSetCookie(setCookieHeader);
      if (token) {
        nextResponse.cookies.set({
          name: COOKIE_NAME,
          value: token,
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? 'strict' : 'lax',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        });
      }
    }

    return nextResponse;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

function extractTokenFromSetCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/deepread_token=([^;]+)/);
  return match ? match[1] : null;
}
