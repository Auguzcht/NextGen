/**
 * Send Child QR Code Email
 * Sends the child's QR code to their guardian's email
 */

import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import { createChildQREmailTemplate } from '../../src/utils/emailTemplates.js';
import { sendEmail } from '../utils/emailProviders.js';

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

    const { firstName, lastName, formalId, guardianEmail, guardianName } = childData;

    console.log(`📧 Sending child QR code email for ${firstName} ${lastName} (${formalId}) to ${guardianEmail}`);

    // Generate QR code as data URL
    let qrCodeDataUrl = null;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(formalId, {
        width: 300,
        margin: 2,
        color: {
          dark: '#30cee4', // NextGen teal
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
    } catch (qrError) {
      console.error('Error generating QR code:', qrError);
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

    // Create email template
    const htmlContent = createChildQREmailTemplate({
      childFirstName: firstName,
      childLastName: lastName,
      childFormalId: formalId,
      guardianName: guardianName,
      qrCodeDataUrl: qrCodeDataUrl
    });

    // Prepare email data
    const emailData = {
      to: [guardianEmail],
      subject: `${firstName}'s Check-In QR Code - NextGen Ministry`,
      html: htmlContent,
      text: `Hello${guardianName ? ` ${guardianName}` : ''},\n\nThank you for registering ${firstName} ${lastName} with NextGen Ministry!\n\nChild ID: ${formalId}\n\nPlease use this ID or the QR code in the email to check in your child.\n\nBlessings,\nNextGen Ministry Davao Team`,
      fromEmail: config.from_email,
      fromName: config.from_name
    };

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
