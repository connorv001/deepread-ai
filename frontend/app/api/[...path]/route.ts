import { NextRequest, NextResponse } from 'next/server';

// Mark this route as dynamic since it uses cookies
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const COOKIE_NAME = 'deepread_token';

// This route proxies ALL API requests to the backend
// It handles authentication automatically by forwarding the cookie

async function handler(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Get the path from params
    const path = params.path.join('/');
    
    // Build the backend URL
    const backendUrl = new URL(`${BACKEND_URL}/api/${path}`);
    
    // Copy query parameters
    const searchParams = request.nextUrl.searchParams;
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.set(key, value);
    });

    // Get the token from the cookie
    const token = request.cookies.get(COOKIE_NAME)?.value;
    
    // Prepare headers
    const headers: Record<string, string> = {};
    
    // Copy relevant headers from original request
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    
    // Add cookie if available
    if (token) {
      headers['Cookie'] = `${COOKIE_NAME}=${token}`;
    }

    // Prepare body for non-GET/HEAD requests
    let body: BodyInit | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      // For multipart/form-data, stream the raw body to preserve boundaries
      if (contentType?.includes('multipart/form-data')) {
        body = await request.arrayBuffer();
      } else {
        body = await request.text();
      }
    }

    // Forward request to backend
    const response = await fetch(backendUrl.toString(), {
      method: request.method,
      headers,
      body,
      credentials: 'include',
    });

    // Check content type to determine if response is binary
    const responseContentType = response.headers.get('content-type') || '';
    const isBinary = responseContentType.includes('application/pdf') || 
                     responseContentType.includes('application/epub') ||
                     responseContentType.includes('application/octet-stream') ||
                     responseContentType.includes('audio/') ||
                     responseContentType.includes('image/');
    
    // Get response data - use arrayBuffer for binary, text for JSON/text
    const responseData = isBinary 
      ? await response.arrayBuffer()
      : await response.text();
    
    // Create response with proper status
    const nextResponse = new NextResponse(responseData, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy response headers
    response.headers.forEach((value, key) => {
      // Skip content-encoding and content-length as they may cause issues
      if (key !== 'content-encoding' && key !== 'content-length') {
        nextResponse.headers.set(key, value);
      }
    });

    // Handle Set-Cookie from backend if present
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      nextResponse.headers.set('Set-Cookie', setCookieHeader);
    }

    // Handle 401 by clearing invalid cookie
    if (response.status === 401 && token) {
      nextResponse.cookies.set({
        name: COOKIE_NAME,
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 0,
        path: '/',
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export handlers for all HTTP methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const HEAD = handler;
export const OPTIONS = handler;
