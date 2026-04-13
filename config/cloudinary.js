import { v2 as cloudinaryV2 } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
// Change this line to use a default import
import multerStorageCloudinary from 'multer-storage-cloudinary';

dotenv.config();

// Destructure CloudinaryStorage from the default import
const { CloudinaryStorage } = multerStorageCloudinary;

cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Debugging Logs (Vercel logs will show these)
console.log('--- Cloudinary Config Check ---');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || '❌ NOT LOADED');

const storage = new CloudinaryStorage({
  cloudinary: cloudinaryV2,
  params: {
    folder: process.env.APP_NAME || 'pos-system',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }],
  },
});

export const upload = multer({ storage });
export { cloudinaryV2 as cloudinary };