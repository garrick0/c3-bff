// Stub config for MVP
export const config = {
  app: {
    environment: process.env.NODE_ENV || 'development'
  },
  bff: {
    port: parseInt(process.env.PORT || '3001'),
    host: process.env.HOST || 'localhost'
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};
