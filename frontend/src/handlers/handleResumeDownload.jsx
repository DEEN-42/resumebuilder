import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import React, { useState } from 'react';
import { showSuccess, showError, showWarning, showInfo } from '../utils/toast.jsx';
// First, install the required dependencies:
// npm install html2canvas jspdf

// or

// yarn add html2canvas jspdf

/**
 * Extract all links from the HTML and their positions
 * @param {HTMLElement} element - Root element to search for links
 * @returns {Array} Array of link objects with position data
 */
const extractAllLinks = (element) => {
  const links = [];
  const linkElements = element.querySelectorAll('a[href]');
  
  linkElements.forEach((linkEl, index) => {
    const href = linkEl.getAttribute('href');
    if (!href || href.startsWith('#')) return; // Skip empty links and internal anchors
    
    // Make sure we have a full URL
    let fullUrl = href;
    if (href.startsWith('mailto:')) {
      fullUrl = href;
    } else if (href.includes('@') && !href.startsWith('http')) {
      fullUrl = `mailto:${href}`;
    } else if (!href.startsWith('http')) {
      fullUrl = href.startsWith('www.') ? `https://${href}` : `https://${href}`;
    }
    
    const rect = linkEl.getBoundingClientRect();
    const containerRect = element.getBoundingClientRect();
    
    links.push({
      id: `link-${index}`,
      url: fullUrl,
      text: linkEl.textContent.trim(),
      element: linkEl,
      // Position relative to container
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
      // Store original position for later calculation
      originalRect: rect,
      containerRect: containerRect
    });
  });
  
  return links;
};

/**
 * Create a pure text-based PDF with proper links
 * This approach reconstructs the resume content as text with working links
 */
export const createTextBasedPDF = async (resumeContainerSelector = '.preview-container', filename = 'resume') => {
  try {
    const container = document.querySelector(resumeContainerSelector);
    if (!container) {
      throw new Error(`Container not found: ${resumeContainerSelector}`);
    }

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    let currentY = margin;
    const lineHeight = 5;
    const sectionSpacing = 8;

    // Helper function to check if we need a new page
    const checkNewPage = (requiredSpace = lineHeight) => {
      if (currentY + requiredSpace > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
        return true;
      }
      return false;
    };

    // Process each page container
    const pageContainers = container.querySelectorAll('.page-break-container');
    
    for (let pageIndex = 0; pageIndex < pageContainers.length; pageIndex++) {
      const pageContainer = pageContainers[pageIndex];
      
      if (pageIndex > 0) {
        pdf.addPage();
        currentY = margin;
      }

      // Process sections in order
      const sections = pageContainer.querySelectorAll('section, .section, .resume-section, .header, .personal-info');
      
      for (const section of sections) {
        // Section headers
        const headers = section.querySelectorAll('h1, h2, h3, h4, .section-title, .name, .title');
        headers.forEach(header => {
          checkNewPage(lineHeight + 2);
          const fontSize = header.tagName === 'H1' || header.classList.contains('name') ? 16 : 
                          header.tagName === 'H2' ? 14 : 12;
          pdf.setFontSize(fontSize);
          pdf.setFont(undefined, 'bold');
          pdf.text(header.textContent.trim(), margin, currentY);
          currentY += lineHeight + 2;
        });

        // Process content elements
        const contentElements = section.querySelectorAll('p, li, div, span');
        
        for (const element of contentElements) {
          // Skip if this element is a header or already processed
          if (element.matches('h1, h2, h3, h4, .section-title, .name, .title')) continue;
          
          const text = element.textContent.trim();
          if (!text) continue;

          checkNewPage();
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'normal');

          // Check if this element contains links
          const links = element.querySelectorAll('a[href]');
          
          if (links.length > 0) {
            // Process text with links
            let processedText = text;
            let xPosition = margin;
            
            // Split text by links and process each part
            const linkData = Array.from(links).map(link => ({
              text: link.textContent.trim(),
              url: link.getAttribute('href'),
              start: text.indexOf(link.textContent.trim()),
              end: text.indexOf(link.textContent.trim()) + link.textContent.trim().length
            }));

            // Sort links by position
            linkData.sort((a, b) => a.start - b.start);

            let lastIndex = 0;
            
            linkData.forEach(linkInfo => {
              // Add text before link
              const beforeText = text.substring(lastIndex, linkInfo.start);
              if (beforeText) {
                pdf.text(beforeText, xPosition, currentY);
                xPosition += pdf.getTextWidth(beforeText);
              }

              // Add the link
              let fullUrl = linkInfo.url;
              if (linkInfo.url.includes('@') && !linkInfo.url.startsWith('mailto:')) {
                fullUrl = `mailto:${linkInfo.url}`;
              } else if (!linkInfo.url.startsWith('http') && !linkInfo.url.startsWith('mailto:')) {
                fullUrl = linkInfo.url.startsWith('www.') ? `https://${linkInfo.url}` : `https://${linkInfo.url}`;
              }

              pdf.setTextColor(0, 0, 255); // Blue for links
              pdf.textWithLink(linkInfo.text, xPosition, currentY, { url: fullUrl });
              pdf.setTextColor(0, 0, 0); // Reset to black
              xPosition += pdf.getTextWidth(linkInfo.text);

              lastIndex = linkInfo.end;
            });

            // Add remaining text after last link
            const remainingText = text.substring(lastIndex);
            if (remainingText) {
              pdf.text(remainingText, xPosition, currentY);
            }
          } else {
            // Regular text without links
            const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
            lines.forEach(line => {
              checkNewPage();
              pdf.text(line, margin, currentY);
              currentY += lineHeight;
            });
            continue; // Skip the currentY increment below
          }

          currentY += lineHeight;
        }

        currentY += sectionSpacing;
      }
    }

    // Save the PDF
    pdf.save(`${filename}.pdf`);

    return {
      success: true,
      message: 'PDF generated successfully with working links',
      pages: pdf.internal.getNumberOfPages()
    };

  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

/**
 * Hybrid approach: Image-based PDF with overlay links
 * -- CORRECTED VERSION 3.0 (DEFINITIVE FIX) --
 * This version intelligently fits the content to the page, preventing
 * it from being cut off while minimizing margins.
 * It maintains high text quality and low file size.
 */
export const createHybridPDF = async (resumeContainerSelector = '.preview-container', filename = 'resume', options = {}) => {
  try {
    const defaultOptions = {
      scale: 4, // High scale for crisp text
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      letterRendering: true,
    };

    const finalOptions = { ...defaultOptions, ...options };

    const previewContainer = document.querySelector(resumeContainerSelector);
    if (!previewContainer) {
      throw new Error(`Preview container not found: ${resumeContainerSelector}`);
    }

    const originalTransform = previewContainer.style.transform;
    previewContainer.style.transform = 'scale(1)';
    await new Promise(resolve => setTimeout(resolve, 100));

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageContainers = previewContainer.querySelectorAll('.page-break-container');
    if (pageContainers.length === 0) {
      throw new Error('No pages found with selector ".page-break-container"');
    }

   let originalStyles = {};

    for (let i = 0; i < pageContainers.length; i++) {
      const pageContainer = pageContainers[i];
      const pageLinks = extractAllLinks(pageContainer);

      originalStyles = {
        boxShadow: pageContainer.style.boxShadow,
        margin: pageContainer.style.margin,
      };
      pageContainer.style.boxShadow = 'none';
      pageContainer.style.margin = '0';
      
      try {
        const canvas = await html2canvas(pageContainer, {
          ...finalOptions,
          width: pageContainer.offsetWidth,
          height: pageContainer.offsetHeight,
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        // --- START OF THE FIX: "Fit to Page" Logic ---
        // This logic ensures the image fits the page without being cut off.

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const pageAspectRatio = pdfWidth / pdfHeight;

        const canvasAspectRatio = canvas.width / canvas.height;

        let finalWidth, finalHeight;

        // Compare aspect ratios to decide how to scale the image
        if (canvasAspectRatio > pageAspectRatio) {
          // If the image is wider than the page, fit it to the page's width
          finalWidth = pdfWidth;
          finalHeight = finalWidth / canvasAspectRatio;
        } else {
          // If the image is taller than the page, fit it to the page's height
          finalHeight = pdfHeight;
          finalWidth = finalHeight * canvasAspectRatio;
        }

        // Center the result on the page
        const xOffset = (pdfWidth - finalWidth) / 2;
        const yOffset = (pdfHeight - finalHeight) / 2;

        // --- END OF THE FIX ---

        if (i > 0) {
          pdf.addPage();
        }

        // Note: The format is 'JPEG' now
        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);

        pageLinks.forEach(link => {
          try {
            const containerRect = pageContainer.getBoundingClientRect();
            const linkRect = link.element.getBoundingClientRect();
            const relativeX = linkRect.left - containerRect.left;
            const relativeY = linkRect.top - containerRect.top;
            const scaleX = finalWidth / pageContainer.offsetWidth;
            const scaleY = finalHeight / pageContainer.offsetHeight;
            const pdfX = xOffset + (relativeX * scaleX);
            const pdfY = yOffset + (relativeY * scaleY);
            const pdfLinkWidth = linkRect.width * scaleX;
            const pdfLinkHeight = linkRect.height * scaleY;
            pdf.link(pdfX, pdfY, pdfLinkWidth, pdfLinkHeight, { url: link.url });
          } catch (linkError) {
            console.warn(`Failed to add link: ${link.text}`, linkError);
          }
        });

      } finally {
        pageContainer.style.boxShadow = originalStyles.boxShadow;
        pageContainer.style.margin = originalStyles.margin;
      }
    }

    previewContainer.style.transform = originalTransform;
    pdf.save(`${filename}.pdf`);

    return {
      success: true,
      message: `PDF generated with ${pageContainers.length} page(s) and working links`,
      pages: pageContainers.length
    };
  } catch (error) {
    console.error('Hybrid PDF generation failed:', error);
    const previewContainer = document.querySelector(resumeContainerSelector);
    if (previewContainer && originalTransform) {
        previewContainer.style.transform = originalTransform;
    }
    throw new Error(`Hybrid PDF generation failed: ${error.message}`);
  }
};

/**
 * Main download function with multiple approaches
 */
export const handleDownload = async (resumeContainerSelector = '.preview-container', filename = 'resume', method = 'hybrid', options = {}) => {
  try {
    switch (method) {
      case 'text':
        return await createTextBasedPDF(resumeContainerSelector, filename);
      case 'hybrid':
        return await createHybridPDF(resumeContainerSelector, filename, options);
      case 'auto':
        try {
          return await createHybridPDF(resumeContainerSelector, filename, options);
        } catch (hybridError) {
          console.warn('Hybrid method failed, trying text-based:', hybridError);
          return await createTextBasedPDF(resumeContainerSelector, filename);
        }
      default:
        throw new Error(`Unknown method: ${method}. Use 'text', 'hybrid', or 'auto'`);
    }
  } catch (error) {
    console.error('PDF download failed:', error);
    throw error;
  }
};

/**
 * React hook for resume download
 */
export const useResumeDownload = (resumeData, filename = 'resume', method = 'hybrid') => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  
  const downloadResume = async (customFilename = null, customMethod = null, options = {}) => {
    setIsDownloading(true);
    setDownloadError(null);
    
    try {
      const finalFilename = customFilename || 
        (resumeData?.personalInfo?.name ? 
          `${resumeData.personalInfo.name.replace(/\s+/g, '_')}_Resume` : 
          filename);
      
      const finalMethod = customMethod || method;
      
      const result = await handleDownload('.preview-container', finalFilename, finalMethod, {
        ...options
      });
      
      return result;
      
    } catch (error) {
      setDownloadError(error.message);
      throw error;
    } finally {
      setIsDownloading(false);
    }
  };
  
  return {
    downloadResume,
    isDownloading,
    downloadError
  };
};

/**
 * Simple download function for onClick handlers
 */
export const handleResumeDownload = async (setIsDownloading, resumeData = null, currentZoom = null, method = 'hybrid') => {
  setIsDownloading(true);
  
  try {
    const filename = resumeData?.personalInfo?.name ? 
      `${resumeData.personalInfo.name.replace(/\s+/g, '_')}_Resume` : 
      'resume';
    
    const previewContainer = document.querySelector('.preview-container');
    let originalTransform = null;
    
    if (currentZoom && previewContainer) {
      originalTransform = previewContainer.style.transform;
      previewContainer.style.transform = 'scale(1)';
      previewContainer.style.transformOrigin = 'top left';
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
      const result = await handleDownload('.preview-container', filename, method, {
        scale: 4
      });
      showNotification("Download Successful", 'success');
      return result;
      
    } finally {
      if (originalTransform && previewContainer) {
        previewContainer.style.transform = originalTransform;
      }
    }
    
  } catch (error) {
    console.error('Download failed:', error);
    showNotification("Download failed",'error');
    throw error;
  } finally {
    setIsDownloading(false);
  }
};

const showNotification = (message, type) => {
  if(type === 'error'){
    showError(message);
  } else if(type === 'success'){
    showSuccess(message);
  } else if(type === 'warning'){
    showWarning(message);
  } else if(type === 'info'){
    showInfo(message);
  } else {
    alert(message); // Fallback only
  }
};