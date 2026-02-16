/** @type {import('next').NextConfig} */
const nextConfig = {
  // BFF Pattern: API routes are handled by Next.js app/api/* routes
  // No rewrites needed - Next.js API routes proxy to backend
  
  // Environment variables available at build time
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;

