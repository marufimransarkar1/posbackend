import { v2 as cloudinaryV2 } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';


if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.error("Cloudinary environment variables are missing!");
}

cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinaryV2, // Ensure this is the actual V2 object
  params: {
    folder: 'pos-system',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

export const upload = multer({ storage });