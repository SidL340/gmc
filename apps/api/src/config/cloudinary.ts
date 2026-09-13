import { v2 as cloudinary } from 'cloudinary';
import { logger } from './logger';

export const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
  });
  return cloudinary;
};

// Initial setup
configureCloudinary();

export { cloudinary };

export const uploadToCloudinary = async (
  filePath: string,
  folder: string = 'gmc/products',
  resourceType: 'image' | 'video' | 'raw' = 'image',
) => {
  configureCloudinary();

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType,
      quality: 'auto',
      fetch_format: 'auto',
    });
    return {
      url:      result.secure_url,
      publicId: result.public_id,
      width:    result.width,
      height:   result.height,
      format:   result.format,
    };
  } catch (err: any) {
    logger.warn('Cloudinary upload warning', { error: err.message || err });
    // If it's a data URL (like barcode or QR code data:image/png;base64,...), fallback safely
    if (filePath.startsWith('data:')) {
      return {
        url:      filePath,
        publicId: `local-${Date.now()}`,
        width:    256,
        height:   256,
        format:   'png',
      };
    }
    throw err;
  }
};

export const deleteFromCloudinary = async (publicId: string) => {
  configureCloudinary();
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err: any) {
    logger.warn('Cloudinary destroy warning', { error: err.message });
  }
};
