import sharp from 'sharp';

/**
 * 图片处理器
 * 负责图片的压缩和裁剪
 */
export class ImageProcessor {
    /**
     * 处理图片（压缩、裁剪）
     */
    static async processImage(image, trimColor) {
        if (!trimColor) return image;

        const trimParams = { background: '#' + trimColor, inlineArt: true };
        return await sharp(image)
            .resize(1080)
            .png({ quality: 80 })
            .trim(trimParams)
            .toBuffer();
    }
}
