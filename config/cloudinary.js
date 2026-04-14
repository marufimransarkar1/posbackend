import { v2 as cloudinaryV2 } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// 1. Explicitly verify configuration
cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// 2. Defensive check: If this logs 'undefined', the import itself is the issue
console.log('Cloudinary Check:', cloudinaryV2.uploader ? '✅ Ready' : '❌ Undefined');

const storage = new CloudinaryStorage({
  // Use the explicitly imported v2 object
  cloudinary: cloudinaryV2, 
  params: async (req, file) => {
    return {
      folder: 'pos-system',
      format: 'png', // or logic to pick format
      public_id: file.originalname.split('.')[0],
    };
  },
});

export const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});