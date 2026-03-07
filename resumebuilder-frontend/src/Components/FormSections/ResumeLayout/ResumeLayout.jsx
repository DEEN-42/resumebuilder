import React, { useRef, useEffect, useState } from 'react'; // Added React import

// A4 page height in pixels (approximately 11.7 inches at 96 DPI)
const A4_HEIGHT = 842; // pixels
const PAGE_PADDING = 24; // Top and bottom padding
const AVAILABLE_HEIGHT = A4_HEIGHT - (PAGE_PADDING * 2);

export const usePageBreak = (data, dependencies = []) => {
  const containerRef = useRef(null);
  const [pages, setPages] = useState([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const calculatePages = () => {
      const container = containerRef.current;
      const children = Array.from(container.children);
      const pageBreaks = [];
      let currentPageHeight = 0;
      let currentPageElements = [];

      children.forEach((child, index) => {
        const childHeight = child.offsetHeight;
        
        // Check if adding this element would exceed page height
        if (currentPageHeight + childHeight > AVAILABLE_HEIGHT && currentPageElements.length > 0) {
          // Start a new page
          pageBreaks.push([...currentPageElements]);
          currentPageElements = [index];
          currentPageHeight = childHeight;
        } else {
          // Add to current page
          currentPageElements.push(index);
          currentPageHeight += childHeight;
        }
      });

      // Add the last page if it has elements
      if (currentPageElements.length > 0) {
        pageBreaks.push(currentPageElements);
      }

      setPages(pageBreaks);
    };

    // Initial calculation
    calculatePages();

    // Recalculate on window resize
    const handleResize = () => {
      setTimeout(calculatePages, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, ...dependencies]);

  return { containerRef, pages, A4_HEIGHT };
};

export const PageBreakWrapper = ({ 
  pages, 
  A4_HEIGHT, 
  containerRef, 
  allElements 
}) => {
  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', padding: '20px 0' }}>
      {/* Visible pages */}
      {pages.length > 0 ? (
        pages.map((pageElements, pageIndex) => (
          <div key={pageIndex}>
            <div 
              className="page-break-container"
              style={{
                width: '595px',
                minHeight: `${A4_HEIGHT}px`,
                margin: '0 auto 20px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                position: 'relative',
                backgroundColor: 'white'
              }}
            >
              {pageElements.map(elementIndex => (
                <React.Fragment key={elementIndex}>
                  {allElements[elementIndex]}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="page-break-container" style={{
          width: '595px',
          minHeight: `${A4_HEIGHT}px`,
          margin: '0 auto',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }}>
          {allElements}
        </div>
      )}
      
      {/* Hidden measuring container - Moved to bottom */}
      <div 
        ref={containerRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '595px',
          visibility: 'hidden'
        }}
      >
        {allElements}
      </div>
    </div>
  );
};