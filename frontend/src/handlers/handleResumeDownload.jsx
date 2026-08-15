import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import React, { useState } from 'react';
import { showSuccess, showError, showWarning, showInfo } from '../utils/toast.jsx';

// ─── Selector constants ────────────────────────────────────────────────────────
// The resume lives inside .resume-preview-wrapper (see project.jsx line 490).
// Each A4 page is a .page-break-container rendered by PageBreakWrapper.
const RESUME_SELECTOR = '.resume-preview-wrapper';
const PAGE_SELECTOR   = '.page-break-container';

/**
 * Extract all links from an element with their positions relative to that element.
 */
const extractAllLinks = (element) => {
  const links = [];
  const linkElements = element.querySelectorAll('a[href]');

  linkElements.forEach((linkEl, index) => {
    const href = linkEl.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    let fullUrl = href;
    if (href.startsWith('mailto:')) {
      fullUrl = href;
    } else if (href.includes('@') && !href.startsWith('http')) {
      fullUrl = `mailto:${href}`;
    } else if (!href.startsWith('http')) {
      fullUrl = `https://${href.replace(/^www\./, '')}`;
    }

    links.push({
      id: `link-${index}`,
      url: fullUrl,
      text: linkEl.textContent.trim(),
      element: linkEl,
    });
  });

  return links;
};

/**
 * Hybrid image-based PDF with clickable link overlays.
 *
 * Steps:
 *  1. Temporarily reset the zoom transform on the wrapper so html2canvas
 *     captures at 1:1 scale (the wrapper is 595 px wide, matching A4).
 *  2. For each .page-break-container snapshot it with html2canvas at scale=4.
 *  3. Fit the canvas image to the A4 page (fill width, zero side margins).
 *  4. Overlay clickable link annotations at the correct positions.
 *  5. Restore all mutated styles.
 */
export const createHybridPDF = async (
  resumeSelector = RESUME_SELECTOR,
  filename = 'resume',
  options = {}
) => {
  let previewWrapper = null;
  let savedTransform = null;

  try {
    previewWrapper = document.querySelector(resumeSelector);
    if (!previewWrapper) {
      throw new Error(
        `Resume wrapper not found. Expected "${resumeSelector}" in the DOM.`
      );
    }

    // 1. Neutralise zoom transform so html2canvas captures at true size.
    savedTransform = previewWrapper.style.transform;
    previewWrapper.style.transform = 'none';
    previewWrapper.style.transformOrigin = 'top left';
    // Give the browser one frame to apply the style before measuring.
    await new Promise(r => setTimeout(r, 150));

    const pageContainers = previewWrapper.querySelectorAll(PAGE_SELECTOR);
    if (pageContainers.length === 0) {
      throw new Error(
        `No pages found. Expected "${PAGE_SELECTOR}" inside "${resumeSelector}".`
      );
    }

    const defaultOpts = {
      scale: 4,           // 4× for sharp text (2380 × 3368 px for A4 @ 96 dpi)
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      letterRendering: true,
      imageTimeout: 15000,
    };
    const captureOpts = { ...defaultOpts, ...options };

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();   // 210 mm
    const pdfH = pdf.internal.pageSize.getHeight();  // 297 mm

    for (let i = 0; i < pageContainers.length; i++) {
      const page = pageContainers[i];

      // Collect links BEFORE we mutate any styles.
      const pageLinks = extractAllLinks(page);

      // Temporarily strip shadow/margin so they don't bleed into the image.
      const savedBoxShadow = page.style.boxShadow;
      const savedMargin    = page.style.margin;
      page.style.boxShadow = 'none';
      page.style.margin    = '0';

      let canvas;
      try {
        canvas = await html2canvas(page, {
          ...captureOpts,
          width:  page.offsetWidth,
          height: page.offsetHeight,
        });
      } finally {
        page.style.boxShadow = savedBoxShadow;
        page.style.margin    = savedMargin;
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Fit image to page width (full bleed – no side margin).
      const canvasAspect = canvas.width / canvas.height;
      const imgW = pdfW;
      const imgH = imgW / canvasAspect;
      const yOffset = (pdfH - imgH) / 2;   // centre vertically if shorter than page

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, Math.max(0, yOffset), imgW, imgH);

      // Overlay clickable links.
      const containerRect = page.getBoundingClientRect();
      const scaleX = imgW / page.offsetWidth;
      const scaleY = imgH / page.offsetHeight;

      pageLinks.forEach(link => {
        try {
          const linkRect = link.element.getBoundingClientRect();
          const rx = linkRect.left - containerRect.left;
          const ry = linkRect.top  - containerRect.top;
          pdf.link(
            rx * scaleX,
            Math.max(0, yOffset) + ry * scaleY,
            linkRect.width  * scaleX,
            linkRect.height * scaleY,
            { url: link.url }
          );
        } catch (e) {
          console.warn(`Link overlay skipped (${link.text}):`, e);
        }
      });
    }

    pdf.save(`${filename}.pdf`);
    return { success: true, pages: pageContainers.length };

  } catch (err) {
    console.error('[createHybridPDF] failed:', err);
    throw new Error(`PDF generation failed: ${err.message}`);
  } finally {
    // Always restore the zoom transform.
    if (previewWrapper && savedTransform !== null) {
      previewWrapper.style.transform = savedTransform;
    }
  }
};

/**
 * Main entry point – currently always uses the hybrid (image) approach.
 */
export const handleDownload = async (
  resumeSelector = RESUME_SELECTOR,
  filename = 'resume',
  method = 'hybrid',
  options = {}
) => {
  if (method === 'hybrid' || method === 'auto') {
    return createHybridPDF(resumeSelector, filename, options);
  }
  throw new Error(`Unknown PDF method: "${method}". Use "hybrid" or "auto".`);
};

/**
 * React hook version (used by components that manage their own loading state).
 */
export const useResumeDownload = (resumeData, filename = 'resume') => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const downloadResume = async (customFilename = null, _method = 'hybrid', options = {}) => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const name = customFilename
        || (resumeData?.personalInfo?.name
          ? `${resumeData.personalInfo.name.replace(/\s+/g, '_')}_Resume`
          : filename);
      return await createHybridPDF(RESUME_SELECTOR, name, options);
    } catch (err) {
      setDownloadError(err.message);
      throw err;
    } finally {
      setIsDownloading(false);
    }
  };

  return { downloadResume, isDownloading, downloadError };
};

/**
 * Simple onClick handler (used by project.jsx / uiHandlers.jsx).
 * Signature kept unchanged so no callers need updating.
 */
export const handleResumeDownload = async (
  setIsDownloading,
  resumeData = null,
  _currentZoom = null,   // zoom is now handled internally – we reset the transform ourselves
  _method = 'hybrid'
) => {
  setIsDownloading(true);
  try {
    const filename = resumeData?.personalInfo?.name
      ? `${resumeData.personalInfo.name.replace(/\s+/g, '_')}_Resume`
      : 'resume';

    await createHybridPDF(RESUME_SELECTOR, filename);
    showNotification('Download successful', 'success');
  } catch (err) {
    console.error('[handleResumeDownload] failed:', err);
    showNotification('Download failed – check console for details.', 'error');
    throw err;
  } finally {
    setIsDownloading(false);
  }
};

// ─── Internal notification helper ─────────────────────────────────────────────
const showNotification = (message, type) => {
  const map = { error: showError, success: showSuccess, warning: showWarning, info: showInfo };
  (map[type] || (m => alert(m)))(message);
};