import { v2 as cloudinaryV2 } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

// 1. Manually trigger dotenv load at the very top of the logic
dotenv.config();

// 2. Configure Cloudinary
cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Good practice to use HTTPS
});

// 3. Debugging Logs
console.log('--- Cloudinary Config Check ---');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || '❌ NOT LOADED');
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? '✅ Present' : '❌ Missing');

// 4. Ping test with more detailed error logging
cloudinaryV2.api.ping()
  .then(result => console.log('✅ Cloudinary Connection: Success!', result))
  .catch(err => {
    console.error('❌ Cloudinary Connection: Failed!');
    // Log the whole error object to see status codes/messages
    console.dir(err, { depth: null }); 
  });

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