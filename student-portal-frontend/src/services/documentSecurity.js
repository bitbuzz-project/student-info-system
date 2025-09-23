import QRCode from 'qrcode';
import CryptoJS from 'crypto-js';

// Hardcoded configuration for testing - CHANGE FOR PRODUCTION
const CONFIG = {
  SIGNATURE_SECRET: '228QYTXF26w4XAUNQ7GQ7Nj5Grat7fSD',
  APP_DOMAIN: 'http://localhost:5173' // Change to your actual domain
};

export class DocumentSecurity {
  
  // Generate document signature
  static generateSignature(documentData) {
    try {
      const dataString = JSON.stringify({
        studentId: documentData.studentId,
        semester: documentData.semester,
        timestamp: documentData.timestamp,
        modules: documentData.modules.length
      });
      
      return CryptoJS.HmacSHA256(dataString, CONFIG.SIGNATURE_SECRET).toString();
    } catch (error) {
      console.error('Error generating signature:', error);
      return 'signature-error';
    }
  }
  
  // Generate verification URL
  static generateVerificationUrl(documentData) {
    try {
      const signature = this.generateSignature(documentData);
      const verificationToken = CryptoJS.AES.encrypt(JSON.stringify({
        studentId: documentData.studentId,
        semester: documentData.semester,
        timestamp: documentData.timestamp,
        signature: signature
      }), CONFIG.SIGNATURE_SECRET).toString();
      
      return `${CONFIG.APP_DOMAIN}/verify-document/${encodeURIComponent(verificationToken)}`;
    } catch (error) {
      console.error('Error generating verification URL:', error);
      return `${CONFIG.APP_DOMAIN}/verify-error`;
    }
  }
  
  // Generate QR code
  static async generateQRCode(verificationUrl) {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 150,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  }
  
  // Verify document signature
  static verifySignature(documentData, providedSignature) {
    try {
      const expectedSignature = this.generateSignature(documentData);
      return expectedSignature === providedSignature;
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }
  
  // Test method
  static test() {
    console.log('DocumentSecurity Config:', {
      hasSecret: !!CONFIG.SIGNATURE_SECRET,
      secretLength: CONFIG.SIGNATURE_SECRET.length,
      domain: CONFIG.APP_DOMAIN
    });
    
    // Test with sample data
    const testData = {
      studentId: 'TEST123',
      semester: 'S1',
      timestamp: new Date().toISOString(),
      modules: [1, 2, 3]
    };
    
    const signature = this.generateSignature(testData);
    const url = this.generateVerificationUrl(testData);
    
    console.log('Test Results:', {
      signature: signature.substring(0, 16) + '...',
      url: url.substring(0, 50) + '...'
    });
    
    return true;
  }
}