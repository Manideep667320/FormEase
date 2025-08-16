import express from 'express';
import { registerRoutes } from './routes.ts';

async function start() {
  const app = express();
  app.use(express.json());

  // Simple request logger to help debugging
  app.use((req, _res, next) => {
    console.log(`[backend] ${req.method} ${req.url}`);
    next();
  });

  try {
    const server = await registerRoutes(app);
    const port = process.env.PORT ? Number(process.env.PORT) : 5000;
    server.listen(port, () => {
      console.log(`Backend server listening on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start backend server', err);
    process.exit(1);
  }
}

start();
