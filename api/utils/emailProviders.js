/**
 * Email Provider Service
 * Handles sending emails through different providers
 */

/**
 * Send email via Resend
 */
async function sendViaResend(apiKey, emailData) {
  const emailPayload = {
    from: `${emailData.fromName} <${emailData.fromEmail}>`,
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text
  };

  // Note: Attachments are now embedded as links in the HTML content
  // This provides better compatibility with Google Drive and external links

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailPayload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Resend API error: ${error.message || response.statusText}`);
  }

  return await response.json();
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(apiKey, emailData) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{
        to: emailData.to.map(email => ({ email })),
        subject: emailData.subject
      }],
      from: {
        email: emailData.fromEmail,
        name: emailData.fromName
      },
      content: [
        {
          type: 'text/html',
          value: emailData.html
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid API error: ${error || response.statusText}`);
  }

  return { success: true, messageId: response.headers.get('x-message-id') };
}

/**
 * Send email via Mailgun
 */
async function sendViaMailgun(apiKey, emailData, domain = 'mg.yourchurch.org') {
  const formData = new URLSearchParams();
  formData.append('from', `${emailData.fromName} <${emailData.fromEmail}>`);
  formData.append('to', emailData.to.join(','));
  formData.append('subject', emailData.subject);
  formData.append('html', emailData.html);
  if (emailData.text) {
    formData.append('text', emailData.text);
  }

  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Mailgun API error: ${error.message || response.statusText}`);
  }

  return await response.json();
}

/**
 * Send email via AWS SES
 */
async function sendViaAWSSES(apiKey, emailData) {
  // Note: AWS SES requires AWS SDK and proper credentials
  // This is a simplified version - you'll need to implement full AWS SES integration
  throw new Error('AWS SES integration requires AWS SDK configuration');
}

/**
 * Send batch emails with rate limiting
 */
export async function sendBatchEmails(provider, apiKey, emailData, batchSize = 100) {
  const results = {
    success: [],
    failed: [],
    total: emailData.recipients.length
  };

  // Split recipients into batches
  const batches = [];
  for (let i = 0; i < emailData.recipients.length; i += batchSize) {
    batches.push(emailData.recipients.slice(i, i + batchSize));
  }

  // Process each batch
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    // Send emails in parallel within the batch
    const batchPromises = batch.map(async (recipient) => {
      try {
        const singleEmailData = {
          fromEmail: emailData.fromEmail,
          fromName: emailData.fromName,
          to: [recipient.email],
          subject: emailData.subject,
          html: emailData.html.replace(/{{name}}/g, recipient.name || 'Guardian'),
          text: emailData.text
        };

        const result = await sendEmail(provider, apiKey, singleEmailData);
        
        results.success.push({
          email: recipient.email,
          messageId: result.id || result.messageId,
          guardianId: recipient.guardianId
        });
      } catch (error) {
        results.failed.push({
          email: recipient.email,
          error: error.message,
          guardianId: recipient.guardianId
        });
      }
    });

    await Promise.all(batchPromises);

    // Add delay between batches to respect rate limits
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Send single email through configured provider
 */
export async function sendEmail(provider, apiKey, emailData) {
  switch (provider.toLowerCase()) {
    case 'resend':
      return await sendViaResend(apiKey, emailData);
    
    case 'sendgrid':
      return await sendViaSendGrid(apiKey, emailData);
    
    case 'mailgun':
      return await sendViaMailgun(apiKey, emailData);
    
    case 'aws ses':
      return await sendViaAWSSES(apiKey, emailData);
    
    default:
      throw new Error(`Unsupported email provider: ${provider}`);
  }
}

/**
 * Validate email configuration
 */
export function validateEmailConfig(config) {
  const errors = [];

  if (!config.provider) {
    errors.push('Provider is required');
  }

  if (!config.api_key) {
    errors.push('API key is required');
  }

  if (!config.from_email) {
    errors.push('From email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.from_email)) {
    errors.push('Invalid from email format');
  }

  if (!config.from_name) {
    errors.push('From name is required');
  }

  if (config.batch_size && (config.batch_size < 1 || config.batch_size > 1000)) {
    errors.push('Batch size must be between 1 and 1000');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
