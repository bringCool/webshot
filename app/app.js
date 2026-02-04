import http from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { ScreenshotService } from './services/screenshot.js';
import { RequestHandler } from './services/request-handler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.TOKEN || 'token';

const server = http.createServer((req, res) => {
    const paths = req.url.split('/').filter(Boolean);

    // GET 请求 - 返回静态文件
    if (req.method === 'GET') {
        if (paths.length === 0 || paths[0] === '') {
            serveStaticFile('public/index.html', res);
            return;
        }
        RequestHandler.sendError(res, 401, 'Invalid token');
        return;
    }

    // POST 请求 - API 截图接口
    if (req.method !== 'POST') {
        RequestHandler.sendError(res, 405, 'Method not allowed. Use POST instead.');
        return;
    }

    if (paths[0] !== TOKEN) {
        RequestHandler.sendError(res, 401, 'Invalid token');
        return;
    }

    const handler = new RequestHandler();
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

function serveStaticFile(filename, res) {
    try {
        const filePath = join(__dirname, filename);
        if (!existsSync(filePath)) {
            RequestHandler.sendError(res, 404, 'File not found');
            return;
        }
        const content = readFileSync(filePath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
    } catch (error) {
        RequestHandler.sendError(res, 500, 'Internal Server Error');
    }
}

server.listen(PORT, () => {
    console.log(`Screenshot API listening at http://localhost:${PORT}`);
});
