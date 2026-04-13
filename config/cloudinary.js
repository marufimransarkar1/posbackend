import { v2 as cloudinaryV2 } from 'cloudinary';
import multer from 'multer';
import pkg from 'multer-storage-cloudinary';

// Handle both potential export styles
const CloudinaryStorage = pkg.CloudinaryStorage || pkg;

cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinaryV2,
  params: {
    folder: 'pos-system',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

export const upload = multer({ storage });