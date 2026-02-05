import { v2 as cloudinary } from 'cloudinary';

// إعداد Cloudinary
// تأكد من إضافة هذه المتغيرات في ملف .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * استخراج Public ID من الرابط للحذف
 */
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  try {
      // التعامل مع روابط Cloudinary القياسية
      if (url.includes('cloudinary.com')) {
        const splitUrl = url.split('/');
        const filename = splitUrl[splitUrl.length - 1];
        const publicId = filename.split('.')[0]; 
        return `meals/${publicId}`; // نفترض أننا نرفع في مجلد meals
      }
      return null;
  } catch (e) {
      console.warn('Error parsing public ID:', e);
      return null;
  }
};

/**
 * رفع الصورة إلى Cloudinary
 * @param {Buffer|string} file - ملف الصورة كـ Buffer أو Base64 string
 * @returns {Promise<string>} - رابط الصورة المباشر
 */
export const uploadImage = async (file) => {
  // If it's a base64 string, use direct upload
  if (typeof file === 'string' && file.startsWith('data:image')) {
      return new Promise((resolve, reject) => {
          cloudinary.uploader.upload(file, {
              folder: 'meals',
              transformation: [
                  { width: 1200, crop: "limit" },
                  { quality: "auto", fetch_format: "auto" }
              ]
          }, (error, result) => {
              if (error) return reject(error);
              resolve(result.secure_url);
          });
      });
  }

  // If it's a buffer (for multipart/form-data future use)
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'meals',
        resource_type: 'image',
        transformation: [
            { width: 1200, crop: "limit" },
            { quality: "auto", fetch_format: "auto" }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    ).end(file);
  });
};

/**
 * حذف الصورة من Cloudinary
 * @param {string} imageUrl - رابط الصورة
 */
export const deleteImage = async (imageUrl) => {
  if (!imageUrl) return;

  // نتجاهل الصور المحلية القديمة (/uploads/)
  if (!imageUrl.includes('cloudinary.com')) return;

  const publicId = getPublicIdFromUrl(imageUrl);
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`Deleted Cloudinary image: ${publicId}`);
    } catch (error) {
      console.error('Failed to delete Cloudinary image:', error);
    }
  }
};
