import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { spawn } from 'child_process';

const PORT = 3001;
const TOKEN = 'test-token';
const SERVER_URL = `http://localhost:${PORT}/${TOKEN}`;

let server;

describe('Screenshot API - Integration Tests', () => {
    before(async () => {
        // 启动测试服务器
        const env = { ...process.env, PORT: String(PORT), TOKEN };
        server = spawn('node', ['app.js'], {
            cwd: process.cwd(),
            env,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // 等待服务器启动
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Server startup timeout')), 10000);

            server.stdout.on('data', (data) => {
                if (data.toString().includes('listening')) {
                    clearTimeout(timeout);
                    resolve();
                }
            });

            server.stderr.on('data', (data) => {
                console.error('Server stderr:', data.toString());
            });
        });

        // 额外等待确保服务器完全启动
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    after(async () => {
        if (server) {
            server.kill();
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    });

    /**
     * 辅助函数：发送 POST 请求
     */
    function postRequest(data) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(data);
            const options = {
                hostname: 'localhost',
                port: PORT,
                path: `/${TOKEN}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = http.request(options, (res) => {
                let body = [];
                res.on('data', chunk => body.push(chunk));
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: Buffer.concat(body)
                    });
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    describe('HTTP Method Validation', () => {
        it('should reject GET request', async () => {
            const response = await new Promise((resolve, reject) => {
                const req = http.request(`http://localhost:${PORT}/${TOKEN}`, {
                    method: 'GET'
                }, (res) => {
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => resolve({ statusCode: res.statusCode, body }));
                });
                req.on('error', reject);
                req.end();
            });

            assert.strictEqual(response.statusCode, 405);
            const json = JSON.parse(response.body);
            assert.strictEqual(json.error, 'Method not allowed. Use POST instead.');
        });

        it('should reject PUT request', async () => {
            const response = await new Promise((resolve, reject) => {
                const req = http.request(`http://localhost:${PORT}/${TOKEN}`, {
                    method: 'PUT'
                }, (res) => {
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => resolve({ statusCode: res.statusCode, body }));
                });
                req.on('error', reject);
                req.end();
            });

            assert.strictEqual(response.statusCode, 405);
        });
    });

    describe('Token Validation', () => {
        it('should reject invalid token', async () => {
            const response = await new Promise((resolve, reject) => {
                const postData = JSON.stringify({ html: '<h1>Test</h1>' });
                const req = http.request(`http://localhost:${PORT}/wrong-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length }
                }, (res) => {
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => resolve({ statusCode: res.statusCode, body }));
                });
                req.on('error', reject);
                req.write(postData);
                req.end();
            });

            assert.strictEqual(response.statusCode, 401);
            const json = JSON.parse(response.body);
            assert.strictEqual(json.error, 'Invalid token');
        });
    });

    describe('Request Body Validation', () => {
        it('should return error when neither url nor html provided', async () => {
            const response = await postRequest({});
            assert.strictEqual(response.statusCode, 500);
            const json = JSON.parse(response.body.toString());
            assert.strictEqual(json.error, 'Internal Server Error');
        });

        it('should handle empty JSON', async () => {
            const response = await postRequest(null);
            assert.strictEqual(response.statusCode, 500);
        });
    });

    describe('HTML Screenshot', () => {
        it('should capture screenshot from HTML', async () => {
            const html = '<html><body><h1>Test Page</h1></body></html>';
            const response = await postRequest({ html, waitFor: 1 });

            assert.strictEqual(response.statusCode, 200);
            assert.strictEqual(response.headers['content-type'], 'image/png');
            assert.ok(response.body.length > 0);
            assert.ok(response.body[0] === 0x89); // PNG header
        });

        it('should capture screenshot with different waitFor values', async () => {
            const html = '<html><body><p>Test</p></body></html>';
            const response = await postRequest({ html, waitFor: 0 });

            assert.strictEqual(response.statusCode, 200);
            assert.ok(response.body.length > 0);
        });

        it('should capture screenshot with trim color', async () => {
            const html = '<html><body style="background:#ffffff; padding:20px;"><p>Test</p></body></html>';
            const response = await postRequest({ html, trimColor: 'ffffff', waitFor: 1 });

            assert.strictEqual(response.statusCode, 200);
            assert.ok(response.body.length > 0);
        });
    });

    describe('URL Screenshot', () => {
        it('should capture screenshot from URL', async () => {
            const response = await postRequest({
                url: 'https://example.com',
                waitFor: 2
            });

            assert.strictEqual(response.statusCode, 200);
            assert.strictEqual(response.headers['content-type'], 'image/png');
            assert.ok(response.body.length > 0);
        });

        it('should handle invalid URL gracefully', async () => {
            const response = await postRequest({
                url: 'not-a-valid-url',
                waitFor: 0
            });

            assert.strictEqual(response.statusCode, 500);
        });
    });

    describe('Parameter Validation', () => {
        it('should handle invalid trimColor', async () => {
            const html = '<html><body><p>Test</p></body></html>';
            const response = await postRequest({ html, trimColor: 'invalid', waitFor: 0 });

            assert.strictEqual(response.statusCode, 500);
        });

        it('should handle negative waitFor', async () => {
            const html = '<html><body><p>Test</p></body></html>';
            const response = await postRequest({ html, waitFor: -1 });

            assert.strictEqual(response.statusCode, 500);
        });
    });

    describe('Content-Type Header', () => {
        it('should return correct Content-Type for image', async () => {
            const html = '<html><body><p>Test</p></body></html>';
            const response = await postRequest({ html, waitFor: 0 });

            assert.strictEqual(response.statusCode, 200);
            assert.strictEqual(response.headers['content-type'], 'image/png');
        });

        it('should return correct Content-Type for error', async () => {
            const response = await postRequest({});

            assert.strictEqual(response.statusCode, 500);
            assert.strictEqual(response.headers['content-type'], 'application/json');
        });
    });
});
