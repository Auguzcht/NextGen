import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY (or fallbacks).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function parseArgs(argv) {
  const args = {
    apply: false,
    limit: null,
    concurrency: 12,
    timeoutMs: 12000,
    retries: 1,
  };

  for (const arg of argv) {
    if (arg === '--apply') args.apply = true;
    else if (arg.startsWith('--limit=')) args.limit = Number(arg.split('=')[1]) || null;
    else if (arg.startsWith('--concurrency=')) args.concurrency = Math.max(1, Number(arg.split('=')[1]) || args.concurrency);
    else if (arg.startsWith('--timeout-ms=')) args.timeoutMs = Math.max(1000, Number(arg.split('=')[1]) || args.timeoutMs);
    else if (arg.startsWith('--retries=')) args.retries = Math.max(0, Number(arg.split('=')[1]) || args.retries);
  }

  return args;
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, timer };
}

async function validatePhotoUrl(url, timeoutMs, retries) {
  if (!url || !String(url).trim()) {
    return { valid: false, reason: 'empty_url' };
  }

  const targetUrl = String(url).trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    return { valid: false, reason: 'invalid_url_format' };
  }

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { controller, timer } = withTimeout(timeoutMs);
    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });

      if (!response.ok) {
        return { valid: false, reason: `http_${response.status}` };
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (!contentType.startsWith('image/')) {
        return { valid: false, reason: `non_image_content_type:${contentType || 'unknown'}` };
      }

      return { valid: true, reason: 'ok' };
    } catch (error) {
      lastError = error;
      const isAbort = error?.name === 'AbortError';
      if (!isAbort && attempt < retries) {
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return { valid: false, reason: `network_error:${lastError?.name || 'unknown'}` };
}

async function fetchChildrenWithPhotos(limit) {
  let query = supabase
    .from('children')
    .select('child_id, formal_id, first_name, last_name, photo_url')
    .not('photo_url', 'is', null)
    .neq('photo_url', '');

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
}

async function processWithConcurrency(items, concurrency, handler) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await handler(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function clearInvalidPhotoUrls(childIds) {
  if (childIds.length === 0) return 0;

  const chunkSize = 100;
  let updated = 0;

  for (let i = 0; i < childIds.length; i += chunkSize) {
    const chunk = childIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('children')
      .update({ photo_url: null })
      .in('child_id', chunk)
      .select('child_id');

    if (error) throw error;
    updated += data?.length || 0;
  }

  return updated;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log('Validating child photo URLs with options:', args);

  const children = await fetchChildrenWithPhotos(args.limit);
  console.log(`Found ${children.length} child record(s) with photo_url to validate.`);

  const checked = await processWithConcurrency(children, args.concurrency, async (child) => {
    const result = await validatePhotoUrl(child.photo_url, args.timeoutMs, args.retries);
    return { child, ...result };
  });

  const invalid = checked.filter((row) => !row.valid);
  const valid = checked.length - invalid.length;

  console.log(`Validation complete. Valid: ${valid}, Invalid: ${invalid.length}`);

  if (invalid.length > 0) {
    console.log('Sample invalid entries:');
    console.table(
      invalid.slice(0, 20).map((row) => ({
        child_id: row.child.child_id,
        formal_id: row.child.formal_id,
        name: `${row.child.first_name || ''} ${row.child.last_name || ''}`.trim(),
        reason: row.reason,
        photo_url: row.child.photo_url,
      }))
    );
  }

  if (!args.apply) {
    console.log('Dry-run mode only. No database changes made. Use --apply to clear invalid photo_url values.');
    return;
  }

  const invalidIds = invalid.map((row) => row.child.child_id);
  const updated = await clearInvalidPhotoUrls(invalidIds);
  console.log(`Apply mode complete. Cleared photo_url for ${updated} child record(s).`);
}

main().catch((error) => {
  console.error('Photo URL validation script failed:', error);
  process.exit(1);
});
