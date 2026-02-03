import { chromium } from 'playwright';

/**
 * 浏览器管理器
 * 负责浏览器的生命周期管理
 */
export class BrowserManager {
    #browser = null;
    #context = null;
    #page = null;

    /**
     * 初始化浏览器
     */
    async init(deviceInfo) {
        this.#browser = await chromium.launch();
        this.#context = await this.#browser.newContext({ ...deviceInfo });
        this.#page = await this.#context.newPage();
        return this.#page;
    }

    /**
     * 关闭浏览器
     */
    async close() {
        try {
            if (this.#context) await this.#context.close();
        } catch (e) {
            // Context may already be closed
        }
        try {
            if (this.#browser) await this.#browser.close();
        } catch (e) {
            // Browser may already be closed
        }
        this.#context = null;
        this.#browser = null;
        this.#page = null;
    }
}
