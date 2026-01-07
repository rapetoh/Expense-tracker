import handler from './build/server/index.js';
import http from 'node:http';

const port = Number(process.env.PORT || 3000);

const server = http.createServer(handler);
server.listen(port, '0.0.0.0', () => {
	console.log(`Listening on ${port}`);
});


