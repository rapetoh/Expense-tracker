import getHandler from './build/server/index.js';
import { serve } from '@hono/node-server';

const port = Number(process.env.PORT || 3000);

// Call the function to get the handler (lazy initialization)
const handler = await getHandler();

serve({
  fetch: handler,
  port,
  hostname: '0.0.0.0',
}, (info) => {
  console.log(`🚀 Server started on port ${info.port}`);
  console.log(`🌍 http://${info.address}:${info.port}`);
});


