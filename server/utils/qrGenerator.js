/**
 * QR Code Generator with Logo
 * Generates QR codes with NextGen logo overlay and uploads to Firebase Storage
 */

import QRCode from 'qrcode';
import { createCanvas, loadImage } from 'canvas';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase with existing config
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig, 'qr-generator');
const storage = getStorage(app);

/**
 * Generate QR code with NextGen logo and upload to Firebase Storage
 * @param {string} value - The value to encode in QR code (child's formal ID)
 * @param {string} childId - The child's ID for filename
 * @returns {Promise<string>} - Public URL of uploaded QR code image
 */
export async function generateAndUploadQR(value, childId) {
  try {
    // QR code settings
    const qrSize = 400; // Larger size for better quality
    const logoSize = 88; // 22% of QR size
    const bgColor = '#ffffff';
    const fgColor = '#30cee4'; // NextGen teal
    
    // Create canvas
    const canvas = createCanvas(qrSize, qrSize);
    const ctx = canvas.getContext('2d');

    // Generate QR code
    await QRCode.toCanvas(canvas, value, {
      width: qrSize,
      margin: 2,
      color: {
        dark: fgColor,
        light: bgColor
      },
      errorCorrectionLevel: 'H' // High error correction for logo overlay
    });

    try {
      // Load NextGen logo
      const logoPath = join(__dirname, '../../public/NextGen-Logo.png');
      const logo = await loadImage(logoPath);
      
      // Draw white background circle for logo
      const logoX = (qrSize - logoSize) / 2;
      const logoY = (qrSize - logoSize) / 2;
      const logoRadius = logoSize / 2;
      
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(qrSize / 2, qrSize / 2, logoRadius + 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw logo
      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
    } catch (logoError) {
      console.warn('Could not load logo, generating QR without logo:', logoError);
      // Continue without logo if it fails to load
    }

    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');

    // Upload to Firebase Storage using client SDK
    const fileName = `NextGen/children-qr/${childId}_${Date.now()}.png`;
    const storageRef = ref(storage, fileName);

    // Upload with metadata
    const metadata = {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000', // Cache for 1 year
    };

    await uploadBytes(storageRef, buffer, metadata);

    // Get public download URL
    const publicUrl = await getDownloadURL(storageRef);
    
    console.log(`✅ QR code uploaded successfully: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('Error generating/uploading QR code:', error);
    throw error;
  }
}

/**
 * Delete old QR code from Firebase Storage
 * @param {string} childId - The child's ID
 */
export async function deleteOldQRCodes(childId) {
  try {
    const folderRef = ref(storage, `NextGen/children-qr/`);
    const fileList = await listAll(folderRef);
    
    // Filter files that start with this childId
    const filesToDelete = fileList.items.filter(item => 
      item.name.startsWith(`${childId}_`)
    );
    
    if (filesToDelete.length > 0) {
      await Promise.all(filesToDelete.map(file => deleteObject(file)));
      console.log(`🗑️  Deleted ${filesToDelete.length} old QR code(s) for child ${childId}`);
    }
  } catch (error) {
    console.warn('Error deleting old QR codes:', error);
    // Don't throw - this is cleanup, not critical
  }
}
