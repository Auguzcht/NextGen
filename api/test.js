/**
 * Simple test endpoint to verify Vercel serverless functions work
 */

export default async function handler(req, res) {
  console.log('✅ Test endpoint hit!', {
    method: req.method,
    timestamp: new Date().toISOString()
  });

  return res.status(200).json({
    ok: true,
    message: 'Vercel serverless functions are working!',
    timestamp: new Date().toISOString(),
    method: req.method
  });
}
