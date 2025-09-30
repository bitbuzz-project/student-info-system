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
      // Create a clean, serializable version of the data
      const cleanData = {
        studentId: documentData.studentId,
        semester: documentData.semester,
        timestamp: documentData.timestamp,
        // Handle different data structures
        itemCount: documentData.modules?.length || 
                   documentData.registrations?.length || 
                   documentData.subjects?.length || 0
      };
      
      const dataString = JSON.stringify(cleanData);
      console.log('Generating signature for:', dataString);
      
      const signature = CryptoJS.HmacSHA256(dataString, CONFIG.SIGNATURE_SECRET).toString();
      console.log('Generated signature:', signature.substring(0, 20) + '...');
      
      return signature;
    } catch (error) {
      console.error('Error generating signature:', error);
      console.error('Document data that caused error:', documentData);
      return 'signature-error';
    }
  }
  
  // Generate verification URL
  static generateVerificationUrl(documentData) {
    try {
      const signature = this.generateSignature(documentData);
      
      // Create a clean token with only essential data
      const tokenData = {
        studentId: documentData.studentId,
        semester: documentData.semester,
        timestamp: documentData.timestamp,
        signature: signature
      };
      
      const verificationToken = CryptoJS.AES.encrypt(
        JSON.stringify(tokenData), 
        CONFIG.SIGNATURE_SECRET
      ).toString();
      
      const url = `${CONFIG.APP_DOMAIN}/verify-document/${encodeURIComponent(verificationToken)}`;
      console.log('Generated verification URL length:', url.length);
      
      return url;
    } catch (error) {
      console.error('Error generating verification URL:', error);
      return `${CONFIG.APP_DOMAIN}/verify-error`;
    }
  }
  
  // Generate QR code
  static async generateQRCode(verificationUrl) {
    try {
      // Check URL length - QR codes have limits
      if (verificationUrl.length > 500) {
        console.warn('URL is very long for QR code:', verificationUrl.length, 'characters');
      }
      
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 150,
        margin: 2,
        errorCorrectionLevel: 'M', // Medium error correction
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      console.log('QR code generated successfully');
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
      url: url.substring(0, 50) + '...',
      signatureValid: signature !== 'signature-error'
    });
    
    return signature !== 'signature-error';
  }
}