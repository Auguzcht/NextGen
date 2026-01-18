/**
 * Send Child QR Code Email
 * Sends the child's QR code to their guardian's email
 */

import { createClient } from '@supabase/supabase-js';
import { createChildQREmailTemplate } from '../../src/utils/emailTemplates.js';
import { sendEmail } from '../utils/emailProviders.js';
import { generateAndUploadQR, deleteOldQRCodes } from '../utils/qrGenerator.js';

// Use non-VITE prefixed vars in production, fallback to VITE_ for development
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { childData } = req.body;

    if (!childData || !childData.guardianEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: childData with guardianEmail' 
      });
    }

    const { firstName, lastName, formalId, guardianEmail, guardianName, childId } = childData;

    console.log(`📧 Sending child QR code email for ${firstName} ${lastName} (${formalId}) to ${guardianEmail}`);

    // Delete old QR codes for this child (cleanup)
    if (childId) {
      await deleteOldQRCodes(childId);
    }

    // Generate QR code with logo and upload to Firebase
    let qrCodeImageUrl = null;
    try {
      qrCodeImageUrl = await generateAndUploadQR(formalId, childId || formalId);
      console.log(`✅ QR code generated and uploaded: ${qrCodeImageUrl}`);
    } catch (qrError) {
      console.error('Error generating/uploading QR code:', qrError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to generate QR code' 
      });
    }

    // Get email configuration from database
    const { data: config, error: configError } = await supabase
      .from('email_api_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.error('Email configuration not found:', configError);
      return res.status(500).json({ 
        success: false, 
        error: 'Email service not configured' 
      });
    }

    // Create email template with hosted image URL
    const htmlContent = createChildQREmailTemplate({
      childFirstName: firstName,
      childLastName: lastName,
      childFormalId: formalId,
      guardianName: guardianName,
      qrCodeImageUrl: qrCodeImageUrl
    });

    // Fetch the QR image and convert to base64 for attachment
    let qrImageBase64 = null;
    try {
      const imageResponse = await fetch(qrCodeImageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      qrImageBase64 = Buffer.from(imageBuffer).toString('base64');
      console.log('✅ QR image fetched and converted to base64 for attachment');
    } catch (fetchError) {
      console.error('Error fetching QR image for attachment:', fetchError);
      // Continue without attachment if fetch fails
    }

    // Prepare email data with attachment
    const emailData = {
      to: [guardianEmail],
      subject: `${firstName}'s Check-In QR Code - NextGen Ministry`,
      html: htmlContent,
      text: `Hello${guardianName ? ` ${guardianName}` : ''},\n\nThank you for registering ${firstName} ${lastName} with NextGen Ministry!\n\nChild ID: ${formalId}\n\nPlease download the attached QR code image to use for quick check-in at our services.\n\nBlessings,\nNextGen Ministry Davao Team`,
      fromEmail: config.from_email,
      fromName: config.from_name
    };

    // Add attachment if base64 conversion was successful
    if (qrImageBase64) {
      emailData.attachments = [
        {
          filename: `${firstName}_${lastName}_QR_${formalId}.png`,
          content: qrImageBase64,
          type: 'image/png',
          disposition: 'attachment'
        }
      ];
      console.log(`📎 Attachment added: ${firstName}_${lastName}_QR_${formalId}.png`);
    } else {
      console.warn('⚠️ No attachment added due to fetch error');
    }

    // Send email
    const result = await sendEmail(
      config.provider,
      config.api_key,
      emailData
    );

    console.log(`✅ Child QR code email sent successfully to ${guardianEmail}`);

    // Log the email in database
    try {
      await supabase
        .from('email_logs')
        .insert({
          recipient_email: guardianEmail,
          subject: emailData.subject,
          status: 'sent',
          sent_date: new Date().toISOString(),
          notes: `Child QR Code | Message ID: ${result.messageId || 'N/A'}`
        });
    } catch (logError) {
      console.warn('Failed to log email:', logError);
      // Don't fail the request if logging fails
    }

    return res.status(200).json({
      success: true,
      message: 'QR code email sent successfully',
      data: {
        recipient: guardianEmail,
        childName: `${firstName} ${lastName}`,
        formalId: formalId,
        messageId: result.messageId || null
      }
    });

  } catch (error) {
    console.error('Error sending child QR email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
}
