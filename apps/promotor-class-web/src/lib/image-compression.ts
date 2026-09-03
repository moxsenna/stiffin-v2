/**
 * Client-side Image Optimization Utility
 * 
 * Automatically downsizes dimensions and converts images to WebP
 * before upload, saving bandwidth, storage, and loading time.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 - 1.0 (default: 0.85)
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  format: 'image/webp' | string;
}

/**
 * Resizes and converts an image file into WebP in the browser via Canvas.
 */
export async function compressAndConvertToWebP(
  inputFile: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1200,
    quality = 0.85,
  } = options;

  return new Promise((resolve, reject) => {
    // 1. Create temporary object URL from file
    const sourceUrl = URL.createObjectURL(inputFile);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(sourceUrl);

      let targetWidth = img.naturalWidth || img.width;
      let targetHeight = img.naturalHeight || img.height;

      // 2. Calculate downscaled dimensions preserving aspect ratio
      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
        targetWidth = Math.round(targetWidth * ratio);
        targetHeight = Math.round(targetHeight * ratio);
      }

      // 3. Create canvas and draw image
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) {
        reject(new Error('Canvas 2D context tidak tersedia di browser'));
        return;
      }

      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // 4. Convert canvas to WebP blob
      const exportFormat = 'image/webp';

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // Fallback to JPEG if WebP export fails on rare legacy environment
            canvas.toBlob(
              (fallbackBlob) => {
                if (!fallbackBlob) {
                  reject(new Error('Gagal mengompres gambar'));
                  return;
                }
                const fallbackName = replaceExtension(inputFile.name, 'jpg');
                const fallbackFile = new File([fallbackBlob], fallbackName, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve({
                  file: fallbackFile,
                  originalSize: inputFile.size,
                  compressedSize: fallbackFile.size,
                  width: targetWidth,
                  height: targetHeight,
                  format: 'image/jpeg',
                });
              },
              'image/jpeg',
              quality
            );
            return;
          }

          const webpName = replaceExtension(inputFile.name, 'webp');
          const webpFile = new File([blob], webpName, {
            type: exportFormat,
            lastModified: Date.now(),
          });

          resolve({
            file: webpFile,
            originalSize: inputFile.size,
            compressedSize: webpFile.size,
            width: targetWidth,
            height: targetHeight,
            format: exportFormat,
          });
        },
        exportFormat,
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error('Gagal memuat gambar untuk dikonversi. File mungkin rusak.'));
    };

    img.src = sourceUrl;
  });
}

function replaceExtension(fileName: string, newExt: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return `${fileName}.${newExt}`;
  return `${fileName.substring(0, lastDot)}.${newExt}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
