
export function imageUrlToBase64(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            try {
                const base64String = canvas.toDataURL('image/png');
                resolve(base64String);
            } catch (e) {
                reject(`转换失败: ${e}`);
            }
        };

        img.onerror = (err) => {
            reject(`图片加载失败: ${err}`);
        };
    });
}

export async function getImageObjectUrl(src) {
    try {
        const response = await fetch(src);
        if (!response.ok) {
            throw new Error(`图片加载失败，状态码: ${response.status}`);
        }
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
            throw new Error('获取的资源不是图片类型');
        }
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('获取图片URL失败:', error);
        throw error;
    }
}
