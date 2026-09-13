import 'dotenv/config';
import 'express-async-errors';
import app from './app';
import { logger } from './config/logger';
import { prisma } from './config/db';
import { autoBootstrapDatabase } from './services/seed.service';

const PORT = process.env.PORT || 5000;

async function main() {
  try {
    // Test DB connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Auto-bootstrap base catalog & admin if brand new cloud DB
    await autoBootstrapDatabase();

    app.listen(PORT, () => {
      logger.info(`🚀 GM Collection House API running on port ${PORT}`);
      logger.info(`   Environment: ${process.env.NODE_ENV}`);
      logger.info(`   Docs: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received. Closing server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

main();
