import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

const PAGE_WIDTH_MM = 297;
const PAGE_HEIGHT_MM = 210;
const PAGE_MARGIN_MM = 25.4;
const CARD_WIDTH_MM = 100;
const CARD_HEIGHT_MM = 70;
const CARD_GAP_X_MM = 8;
const CARD_GAP_Y_MM = 8;
const MM_TO_PT = 72 / 25.4;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let LOCAL_TEMPLATE_DATA_URL = '';

const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || 'nodado-portfolio.firebasestorage.app';

function getFirebaseStorage() {
  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig, 'id-export-uploader');
  return getStorage(app);
}

function getLocalTemplateDataUrl() {
  if (LOCAL_TEMPLATE_DATA_URL) return LOCAL_TEMPLATE_DATA_URL;

  const templatePath = join(__dirname, '../../public/NXTGen-Child-ID-Template.png');
  const templateBuffer = readFileSync(templatePath);
  LOCAL_TEMPLATE_DATA_URL = `data:image/png;base64,${templateBuffer.toString('base64')}`;
  return LOCAL_TEMPLATE_DATA_URL;
}

async function uploadExportPdfToFirebase(pdfBuffer, timestamp) {
  const storage = getFirebaseStorage();
  const objectPath = `NextGen/id-export/${timestamp}-batch.pdf`;
  const storageRef = ref(storage, objectPath);

  await uploadBytes(storageRef, pdfBuffer, {
    contentType: 'application/pdf',
    cacheControl: 'private, max-age=0, no-store',
  });

  const downloadUrl = await getDownloadURL(storageRef);
  const gsPath = `gs://${FIREBASE_STORAGE_BUCKET}/${objectPath}`;
  return { gsPath, downloadUrl };
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function mmToPt(mm) {
  return mm * MM_TO_PT;
}

function getCardsPerPage() {
  const pageWidth = mmToPt(PAGE_WIDTH_MM);
  const pageHeight = mmToPt(PAGE_HEIGHT_MM);
  const margin = mmToPt(PAGE_MARGIN_MM);
  const cardW = mmToPt(CARD_WIDTH_MM);
  const cardH = mmToPt(CARD_HEIGHT_MM);
  const gapX = mmToPt(CARD_GAP_X_MM);
  const gapY = mmToPt(CARD_GAP_Y_MM);

  const cols = Math.max(1, Math.floor((pageWidth - 2 * margin + gapX) / (cardW + gapX)));
  const rows = Math.max(1, Math.floor((pageHeight - 2 * margin + gapY) / (cardH + gapY)));
  return cols * rows;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeCode128(value) {
  return String(value ?? '')
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code <= 126 ? char : '?';
    })
    .join('');
}

function mapChildToSnapshot(row) {
  const guardians = row.child_guardian || [];
  const primary = guardians.find((g) => g.is_primary) || guardians[0] || null;
  const guardianName = primary?.guardians
    ? `${primary.guardians.first_name || ''} ${primary.guardians.last_name || ''}`.trim()
    : '';

  return {
    child_id: row.child_id,
    formal_id: row.formal_id || 'N/A',
    first_name: row.first_name || '',
    last_name: row.last_name || '',
    nickname: row.nickname || '',
    photo_url: row.photo_url || '',
    birthdate: row.birthdate,
    age_category: row.age_categories?.category_name || 'N/A',
    guardian_name: guardianName || 'N/A',
    guardian_contact: primary?.guardians?.phone_number || primary?.guardians?.email || 'N/A',
  };
}

function computeExportCounts(rows) {
  const isEligible = (row) => Boolean(row?.is_active && row?.nickname && row?.photo_url);
  const counts = {
    totalActive: rows.length,
    eligible: 0,
    pending: 0,
    reprintNeeded: 0,
    printed: 0,
    hold: 0,
    incomplete: 0,
    exportable: 0,
  };

  for (const row of rows) {
    const eligible = isEligible(row);
    if (eligible) counts.eligible += 1;
    else counts.incomplete += 1;

    if (row.id_print_status === 'pending') counts.pending += 1;
    if (row.id_print_status === 'reprint_needed') counts.reprintNeeded += 1;
    if (row.id_print_status === 'printed') counts.printed += 1;
    if (row.id_print_status === 'hold') counts.hold += 1;

    if (eligible && (row.id_print_status === 'pending' || row.id_print_status === 'reprint_needed')) {
      counts.exportable += 1;
    }
  }

  return { counts, isEligible };
}

function fillSnapshotsForPreviewPage(snapshots, target) {
  if (target <= 0 || snapshots.length === 0) return snapshots;
  if (snapshots.length >= target) return snapshots.slice(0, target);

  const filled = [...snapshots];
  let cursor = 0;
  while (filled.length < target) {
    filled.push({ ...snapshots[cursor % snapshots.length] });
    cursor += 1;
  }
  return filled;
}

function buildBatchPrintHtml(snapshots, templateUrl) {
  const cards = snapshots.map((child) => {
    const guardianParts = String(child.guardian_name || '').trim().split(/\s+/);
    const guardianFirst = guardianParts[0] || 'N/A';
    const guardianLast = guardianParts.slice(1).join(' ');
    const barcodeValue = sanitizeCode128(child.formal_id || child.child_id);
    const age = child.birthdate
      ? Math.floor((Date.now() - new Date(child.birthdate).getTime()) / 31557600000)
      : 'N/A';
    const initials = `${(child.first_name || '').charAt(0)}${(child.last_name || '').charAt(0)}`.toUpperCase();

    return `
      <article class="id-card">
        <img src="${escapeHtml(templateUrl)}" class="template" alt="Template" />
        <div class="photo-shell">
          <img src="${escapeHtml(child.photo_url)}" class="photo" alt="${escapeHtml(`${child.first_name} ${child.last_name}`)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
          <div class="photo-fallback">${escapeHtml(initials || 'N/A')}</div>
        </div>

        <div class="text-block">
          <div class="nickname">${escapeHtml((child.nickname || 'N/A').toUpperCase())}</div>
          <div class="fullname">${escapeHtml(`${child.first_name || ''} ${child.last_name || ''}`.trim())}</div>
          <div class="age-row">
            <span class="age">Age/Group: <span class="age-value">${escapeHtml(Number.isFinite(age) ? String(age) : 'N/A')}</span></span>
            <span class="age-badge">${escapeHtml(child.age_category || 'N/A')}</span>
          </div>
          <div class="guardian-lines">
            <div><span class="label">Guardian Name:</span> ${escapeHtml(`${guardianFirst} ${guardianLast}`.trim())}</div>
            ${child.guardian_contact ? `<div><span class="label">Guardian Contact:</span> ${escapeHtml(child.guardian_contact)}</div>` : ''}
            <div><span class="label">Registration Date:</span> ${escapeHtml(new Date().toISOString().split('T')[0])}</div>
          </div>
        </div>

        <div class="barcode-block">
          <svg class="barcode" data-value="${escapeHtml(barcodeValue)}"></svg>
          <div class="barcode-label">${escapeHtml(barcodeValue)}</div>
        </div>
      </article>
    `;
  }).join('');

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: A4 landscape; margin: 25.4mm; }
        body { margin: 0; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .sheet { display: grid; grid-template-columns: repeat(auto-fill, 100mm); gap: 8mm; justify-content: center; align-content: start; }
        .id-card { position: relative; width: 100mm; height: 70mm; overflow: hidden; }
        .template { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .photo-shell { position: absolute; left: 7.35mm; top: 15.3mm; width: 32.6mm; height: 32.6mm; border-radius: 4mm; overflow: hidden; background: #ecfeff; display: flex; align-items: center; justify-content: center; }
        .photo { width: 100%; height: 100%; object-fit: cover; }
        .photo-fallback { display: none; font-size: 20px; font-weight: 700; color: #1ca7bc; }
        .text-block { position: absolute; left: 45mm; top: 15.5mm; right: 6mm; color: #1f2937; }
        .nickname { font-size: 20px; font-weight: 900; text-transform: uppercase; line-height: 1.05; letter-spacing: 0.02em; color: #30cee4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fullname { margin-top: 1.5mm; font-size: 10px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .age-row { margin-top: 2mm; display: flex; align-items: center; gap: 2mm; }
        .age { font-size: 9px; font-weight: 600; color: #1f2937; }
        .age-value { font-weight: 400; }
        .age-badge { display: inline-flex; padding: 0.5mm 3mm; border-radius: 999px; font-size: 7.5px; font-weight: 700; color: #fff; background: #30cee4; white-space: nowrap; }
        .guardian-lines { margin-top: 2mm; display: grid; gap: 0.8mm; font-size: 8.5px; color: #1f2937; }
        .guardian-lines .label { font-weight: 600; }
        .barcode-block { position: absolute; left: 13mm; right: 13mm; bottom: 1mm; display: flex; flex-direction: column; align-items: center; }
        .barcode { width: 100%; height: 30px; }
        .barcode-label { margin-top: 0.8mm; width: 100%; text-align: center; font-size: 8.6px; font-weight: 700; letter-spacing: 0.16em; color: #30cee4; }
      </style>
    </head>
    <body>
      <main class="sheet">${cards}</main>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.12.1/dist/JsBarcode.all.min.js"></script>
      <script>
        document.querySelectorAll('svg.barcode').forEach((el) => {
          const value = el.getAttribute('data-value') || 'N/A';
          JsBarcode(el, value, {
            format: 'CODE128',
            width: 1.6,
            height: 30,
            margin: 1.7,
            displayValue: false,
            lineColor: '#30cee4',
            background: '#ffffff',
            flat: true,
          });
        });
      </script>
    </body>
  </html>`;
}

async function renderBatchPdfViaPuppeteer(snapshots, templateUrl) {
  const html = buildBatchPrintHtml(snapshots, templateUrl);
  const runningInServerless = Boolean(process.env.VERCEL || process.env.AWS_REGION || process.env.LAMBDA_TASK_ROOT);

  const browser = runningInServerless
    ? await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      })
    : await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('.id-card', { timeout: 10000 });

    await page.evaluate(async () => {
      const images = Array.from(document.images || []);
      if (images.length === 0) return;

      const waitForImage = (img) => new Promise((resolve) => {
        if (img.complete) {
          resolve(img.naturalWidth > 0);
          return;
        }
        img.addEventListener('load', () => resolve(true), { once: true });
        img.addEventListener('error', () => resolve(false), { once: true });
      });

      await Promise.race([
        Promise.all(images.map(waitForImage)),
        new Promise((resolve) => setTimeout(resolve, 45000)),
      ]);
    });

    await page.waitForFunction(
      () => {
        const barcodes = Array.from(document.querySelectorAll('svg.barcode'));
        if (barcodes.length === 0) return false;
        return barcodes.every((svg) => svg.querySelector('rect, path'));
      },
      { timeout: 10000 }
    ).catch(() => null);

    await new Promise((resolve) => setTimeout(resolve, 300));
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '25.4mm', right: '25.4mm', bottom: '25.4mm', left: '25.4mm' },
      timeout: 0,
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ success: false, error: 'Missing Supabase environment variables.' });
    }

    const authHeader = req.headers.authorization || '';
    const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: { user }, error: userError } = await authedClient.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'Unauthorized user' });
    }

    const { data: staff, error: staffError } = await serviceClient
      .from('staff')
      .select('staff_id, access_level, is_active')
      .eq('user_id', user.id)
      .single();

    if (staffError || !staff || !staff.is_active || (staff.access_level ?? 0) < 10) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const mode = req.body?.mode;
    if (!mode || !['preview', 'generate'].includes(mode)) {
      return res.status(400).json({ success: false, error: 'Invalid mode. Use preview or generate.' });
    }

    const { data: rows, error: fetchError } = await serviceClient
      .from('children')
      .select(`
        child_id,
        formal_id,
        first_name,
        last_name,
        nickname,
        photo_url,
        gender,
        birthdate,
        is_active,
        id_print_status,
        age_categories(category_name),
        child_guardian(
          is_primary,
          guardians(first_name, last_name, phone_number, email)
        )
      `)
      .eq('is_active', true)
      .order('child_id', { ascending: true });

    if (fetchError) {
      return res.status(500).json({ success: false, error: fetchError.message });
    }

    const { counts, isEligible } = computeExportCounts(rows || []);
    if (mode === 'preview') {
      return res.status(200).json({ success: true, mode, counts });
    }

    const includeReprints = req.body?.includeReprints !== false;
    const dryRun = req.body?.dryRun === true;
    const fillPageForTest = req.body?.fillPageForTest === true;

    const candidates = (rows || []).filter((row) => {
      if (!isEligible(row)) return false;
      if (row.id_print_status === 'pending') return true;
      if (includeReprints && row.id_print_status === 'reprint_needed') return true;
      return false;
    });

    if (candidates.length === 0) {
      return res.status(200).json({
        success: true,
        mode,
        counts,
        exportedCount: 0,
        message: 'No eligible children to export right now.',
      });
    }

    const snapshots = candidates.map(mapChildToSnapshot);
    const cardsPerPage = getCardsPerPage();
    const pdfSnapshots = dryRun && fillPageForTest
      ? fillSnapshotsForPreviewPage(snapshots, cardsPerPage)
      : snapshots;

    const templateDataUrl = getLocalTemplateDataUrl();
    const pdfBuffer = await renderBatchPdfViaPuppeteer(pdfSnapshots, templateDataUrl);
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    if (dryRun) {
      return res.status(200).json({
        success: true,
        mode,
        dryRun: true,
        counts,
        exportedCount: pdfSnapshots.length,
        eligibleForExport: snapshots.length,
        cardsPerPage,
        filledForPreview: pdfSnapshots.length,
        layoutVersion: 'vercel-puppeteer-printableid-1to1',
        previewChild: snapshots[0] || null,
        pdfBase64,
      });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const { gsPath, downloadUrl } = await uploadExportPdfToFirebase(pdfBuffer, timestamp);

    const { data: finalizeData, error: finalizeError } = await serviceClient.rpc('finalize_child_id_export_batch', {
      p_initiated_by_staff_id: staff.staff_id,
      p_layout_version: 'vercel-puppeteer-printableid-1to1',
      p_file_path: gsPath,
      p_file_size_bytes: pdfBuffer.length,
      p_children_snapshot: snapshots,
    });

    if (finalizeError) {
      return res.status(500).json({ success: false, error: `Finalize batch failed: ${finalizeError.message}` });
    }

    const batchRow = Array.isArray(finalizeData) ? finalizeData[0] : null;

    return res.status(200).json({
      success: true,
      mode,
      counts,
      batchId: batchRow?.batch_id || null,
      exportedCount: batchRow?.exported_count || snapshots.length,
      filePath: gsPath,
      downloadUrl,
      layoutVersion: 'vercel-puppeteer-printableid-1to1',
      localGenerated: false,
      storageProvider: 'firebase-storage',
    });
  } catch (error) {
    console.error('Vercel id-export error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to export IDs' });
  }
}
