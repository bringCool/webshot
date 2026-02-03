/**
 * HTTP 请求处理器
 * 负责处理请求解析和响应
 */
export class RequestHandler {
    #chunkBuffer = [];

    /**
     * 处理请求体数据
     */
    handleBody(chunk) {
        this.#chunkBuffer.push(chunk);
    }

    /**
     * 解析请求体
     */
    async parseBody() {
        const body = Buffer.concat(this.#chunkBuffer).toString();
        return JSON.parse(body || '{}');
    }

    /**
     * 重置处理器状态
     */
    reset() {
        this.#chunkBuffer = [];
    }

    /**
     * 发送图片响应
     */
    static sendImage(res, image) {
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': image.length,
        });
        res.end(image);
    }

    /**
     * 发送错误响应
     */
    static sendError(res, statusCode, error, message = '') {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error, message }));
    }
}
