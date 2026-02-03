import http from 'http';
import { ScreenshotService } from './services/screenshot.js';
import { RequestHandler } from './services/request-handler.js';

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.TOKEN || 'token';

const server = http.createServer((req, res) => {
    const handler = new RequestHandler();

    if (req.method !== 'POST') {
        RequestHandler.sendError(res, 405, 'Method not allowed. Use POST instead.');
        return;
    }

    const paths = req.url.split('/').filter(Boolean);
    if (paths[0] !== TOKEN) {
        RequestHandler.sendError(res, 401, 'Invalid token');
        return;
    }

    req.on('data', chunk => handler.handleBody(chunk));
    req.on('end', async () => {
        try {
            const params = await handler.parseBody();
            const image = await ScreenshotService.capture(params);
            RequestHandler.sendImage(res, image);
        } catch (error) {
            RequestHandler.sendError(res, 500, 'Internal Server Error', error.message);
            console.error('Error:', error);
        } finally {
            handler.reset();
        }
    });
});

server.listen(PORT, () => {
    console.log(`Screenshot API listening at http://localhost:${PORT}`);
});
