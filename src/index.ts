/**
 * BFF Server Entry Point
 */

import { createServer } from './server.js';
import { config } from './config.js';
import { createLogger } from '@garrick0/c3-shared';

const logger = createLogger('BFF');

async function start() {
  try {
    const server = await createServer();

    server.listen(config.bff.port, config.bff.host, () => {
      logger.info(`BFF server running`, {
        host: config.bff.host,
        port: config.bff.port,
        env: config.app.environment
      });
      console.log(`\n🚀 C3 BFF Server running at http://${config.bff.host}:${config.bff.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

start();
