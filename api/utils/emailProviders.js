/**
 * Email Provider Service
 * Handles sending emails through different providers
 */

/**
 * Send email via Resend (single email)
 */
async function sendViaResend(apiKey, emailData) {
  console.log('📤 RESEND ENDPOINT: POST https://api.resend.com/emails (Individual)');
  console.log('📧 Individual email to:', emailData.to[0]);
  
  const emailPayload = {
    from: `${emailData.fromName} <${emailData.fromEmail}>`,
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text
  };

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
 * Send batch emails via Resend (using batch endpoint with proper limits and idempotency)
 */
async function sendBatchViaResend(apiKey, emailData, batchId) {
  const results = {
    success: [],
    failed: [],
    total: emailData.recipients.length
  };

  // Resend batch API can handle up to 50 emails per request (not 100!)
  const maxBatchSize = 50;
  const batches = [];
  
  for (let i = 0; i < emailData.recipients.length; i += maxBatchSize) {
    batches.push(emailData.recipients.slice(i, i + maxBatchSize));
  }

  console.log(`📧 Resend Batch: Processing ${batches.length} batch(es) of max ${maxBatchSize} emails each`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    try {
      // Prepare batch payload with individual email objects
      const batchPayload = batch.map(recipient => ({
        from: `${emailData.fromName} <${emailData.fromEmail}>`,
        to: [recipient.email],
        subject: emailData.subject,
        html: emailData.html.replace(/{{name}}/g, recipient.name || 'Guardian'),
        text: emailData.text || undefined
      }));

      // Generate unique idempotency key for this batch
      const idempotencyKey = `nxtgen-batch/${batchId}-${batchIndex}-${Date.now()}`;

      const requestBody = JSON.stringify(batchPayload);
      const options = {
        idempotencyKey: idempotencyKey
      };

      console.log(`📧 Sending batch ${batchIndex + 1}/${batches.length} (${batch.length} emails) with idempotency key: ${idempotencyKey}`);
      console.log('📤 RESEND ENDPOINT: POST https://api.resend.com/emails/batch (Batch)');
      console.log('📧 Batch recipients:', batch.map(r => r.email).join(', '));

      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: requestBody
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Resend Batch API error: ${error.message || response.statusText}`);
      }

      const result = await response.json();
      
      // Process results for this batch
      if (result.data && Array.isArray(result.data)) {
        result.data.forEach((emailResult, index) => {
          const recipient = batch[index];
          if (emailResult && emailResult.id) {
            results.success.push({
              email: recipient.email,
              messageId: emailResult.id,
              guardianId: recipient.guardianId
            });
          } else {
            results.failed.push({
              email: recipient.email,
              error: emailResult?.error || 'Unknown error',
              guardianId: recipient.guardianId
            });
          }
        });
      } else {
        // If no data array, mark all as failed
        batch.forEach(recipient => {
          results.failed.push({
            email: recipient.email,
            error: 'Invalid batch response format',
            guardianId: recipient.guardianId
          });
        });
      }

      console.log(`📧 Batch ${batchIndex + 1} completed: ${batch.length} attempted`);

    } catch (error) {
      console.error(`❌ Batch ${batchIndex + 1} failed completely:`, error);
      
      // Mark all emails in this batch as failed
      batch.forEach(recipient => {
        results.failed.push({
          email: recipient.email,
          error: error.message,
          guardianId: recipient.guardianId
        });
      });
    }

    // Add delay between batches to respect rate limits (1 second)
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
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
 * Send batch emails with smart API selection based on recipient count
 */
export async function sendBatchEmails(provider, apiKey, emailData, batchSize = 50) {
  const results = {
    success: [],
    failed: [],
    total: emailData.recipients.length
  };

  const recipientCount = emailData.recipients.length;
  
  // Decision logic: Use batch API for 3+ recipients, individual API for 1-2 recipients
  const useBatchAPI = recipientCount >= 3;
  
  console.log(`📧 Email Strategy: ${recipientCount} recipient(s) -> ${useBatchAPI ? 'Batch API' : 'Individual API'} (${provider})`);

  if (provider.toLowerCase() === 'resend') {
    if (useBatchAPI) {
      // Use Resend Batch API for 3+ recipients
      console.log(`📧 Using Resend Batch API (/emails/batch) for ${recipientCount} recipients`);
      console.log('🔄 Will use batch API due to large recipient count (≥ 3)');
      
      // Generate unique batch ID for idempotency
      const batchId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const batchResult = await sendBatchViaResend(apiKey, emailData, batchId);
      
      // Merge results
      results.success.push(...batchResult.success);
      results.failed.push(...batchResult.failed);
      
      console.log(`✅ Batch API (/emails/batch) completed: ${batchResult.success.length} sent, ${batchResult.failed.length} failed`);
      
    } else {
      // Use Individual API for 1-2 recipients
      console.log(`📧 Using Resend Individual API (/emails) for ${recipientCount} recipient(s)`);
      console.log('🔄 Will make individual API calls due to small recipient count (< 3)');
      
      for (let i = 0; i < emailData.recipients.length; i++) {
        const recipient = emailData.recipients[i];
        
        try {
          const singleEmailData = {
            fromEmail: emailData.fromEmail,
            fromName: emailData.fromName,
            to: [recipient.email],
            subject: emailData.subject,
            html: emailData.html.replace(/{{name}}/g, recipient.name || 'Guardian'),
            text: emailData.text
          };

          const result = await sendViaResend(apiKey, singleEmailData);
          
          results.success.push({
            email: recipient.email,
            messageId: result.id,
            guardianId: recipient.guardianId
          });
          
          console.log(`✅ Individual email ${i + 1}/${recipientCount} sent successfully to ${recipient.email} (Message ID: ${result.id})`);
          
        } catch (error) {
          results.failed.push({
            email: recipient.email,
            error: error.message,
            guardianId: recipient.guardianId
          });
          
          console.error(`❌ Individual email ${i + 1}/${recipientCount} failed to ${recipient.email}:`, error.message);
        }

        // Add delay between individual emails to respect rate limits (500ms)
        if (i < emailData.recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    return results;
  }

  // Fallback: Use individual email sending for other providers
  console.log(`📧 Using individual email sending for provider: ${provider}`);
  
  // Split recipients into smaller batches for individual sending
  const batches = [];
  for (let i = 0; i < emailData.recipients.length; i += batchSize) {
    batches.push(emailData.recipients.slice(i, i + batchSize));
  }

  // Process each batch with individual emails
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    // Send emails sequentially for other providers to respect rate limits
    for (const recipient of batch) {
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

      // Add delay between emails to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Add delay between batches
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
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
