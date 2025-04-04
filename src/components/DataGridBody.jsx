import React, { useState, useEffect, useRef, useCallback } from "react";
import "./DataGrid.css";
import _ from "lodash";

const DataGridBody = ({
  data,
  headers,
  totalColumnsWidth,
  scrollLeft,
  onScroll,
}) => {
  const [visibleRows, setVisibleRows] = useState([]);
  const [startIndex, setStartIndex] = useState(0);
  const containerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const mutationObserverRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [measuredRowHeight, setMeasuredRowHeight] = useState(35);
  const scrollTicking = useRef(false);

  /**
   * ResizeObserver for the body container
   * Optimizes performance by tracking actual container size changes
   */
  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    // Create new ResizeObserver with better performance characteristics
    const resizeObserver = new ResizeObserver(
      _.debounce((entries) => {
        const entry = entries[0];
        if (!entry) return;

        const { width, height } = entry.contentRect;

        // Only update if dimensions changed to prevent unnecessary renders
        setDimensions((prev) => {
          if (prev.width === width && prev.height === height) return prev;

          console.log("DataGridBody resized:", { width, height });
          return { width, height };
        });

        // Recalculate visible rows and measure row height
        if (containerRef.current) {
          measureRowHeight();
          calculateVisibleRows();
        }
      }, 50)
    );

    resizeObserverRef.current = resizeObserver;
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  /**
   * MutationObserver for tracking DOM changes
   * Helps maintain accurate rendering when content changes
   */
  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup previous observer
    if (mutationObserverRef.current) {
      mutationObserverRef.current.disconnect();
    }

    // Create new MutationObserver focusing on layout-affecting changes
    const mutationObserver = new MutationObserver(
      _.debounce((mutations) => {
        // Filter for relevant mutations (style/class changes, content changes)
        const relevantMutation = mutations.some(
          (mutation) =>
            (mutation.type === "attributes" &&
              (mutation.attributeName === "class" ||
                mutation.attributeName === "style")) ||
            mutation.type === "childList"
        );

        if (relevantMutation && containerRef.current) {
          console.log(
            "DataGridBody DOM mutation detected - recalculating layout"
          );
          measureRowHeight();
          calculateVisibleRows();
        }
      }, 50)
    );

    mutationObserverRef.current = mutationObserver;

    // Only observe changes that would affect layout
    mutationObserver.observe(containerRef.current, {
      attributes: true,
      attributeFilter: ["class", "style"],
      childList: true,
      subtree: true,
    });

    return () => {
      mutationObserver.disconnect();
    };
  }, []);

  // Helper function to measure actual row height
  const measureRowHeight = useCallback(() => {
    if (!containerRef.current) return;

    const rowElement = containerRef.current.querySelector(".data-grid-row");
    if (!rowElement) return;

    const computedHeight = Math.round(
      rowElement.getBoundingClientRect().height
    );

    if (
      computedHeight > 0 &&
      Math.abs(computedHeight - measuredRowHeight) > 1
    ) {
      console.log("Measured row height changed:", computedHeight);
      setMeasuredRowHeight(computedHeight);
    }
  }, [measuredRowHeight]);

  // Calculate visible rows based on scroll position - optimized version
  const calculateVisibleRows = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight || dimensions.height;

    // Calculate viewport in row coordinates
    const visibleRowCount = Math.ceil(clientHeight / measuredRowHeight);

    // Add overscan rows to avoid blank areas during scrolling
    // This replaces the fixed buffer with a more adaptive approach
    const overscanRowCount = Math.ceil(visibleRowCount * 0.5); // 50% of visible area

    // Calculate range with overscan
    const start = Math.max(
      0,
      Math.floor(scrollTop / measuredRowHeight) - overscanRowCount
    );
    const end = Math.min(
      data.length - 1,
      Math.floor(scrollTop / measuredRowHeight) +
        visibleRowCount +
        overscanRowCount
    );

    setStartIndex(start);
    setVisibleRows(data.slice(start, end + 1));

    // Reset scroll ticking flag
    scrollTicking.current = false;

    console.log("Visible rows recalculated:", {
      start,
      end,
      visibleCount: end - start + 1,
      overscanRowCount,
      rowHeight: measuredRowHeight,
    });
  }, [data, measuredRowHeight, dimensions.height]);

  // Initialize and handle scroll events with improved performance
  useEffect(() => {
    if (!containerRef.current) return;

    // Initial calculation and measurement
    calculateVisibleRows();
    measureRowHeight();

    // Optimized scroll handler using requestAnimationFrame to limit updates
    const handleScroll = (e) => {
      // Only schedule update if we're not already processing one
      if (!scrollTicking.current) {
        scrollTicking.current = true;

        requestAnimationFrame(() => {
          calculateVisibleRows();
          onScroll(e.target.scrollLeft);
        });
      }
    };

    const container = containerRef.current;
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [data, calculateVisibleRows, measureRowHeight, onScroll]);

  // React to data length changes
  useEffect(() => {
    if (containerRef.current) {
      calculateVisibleRows();
    }
  }, [data.length, calculateVisibleRows]);

  // Format cell value based on data type
  const formatCellValue = (value) => {
    if (value === undefined || value === null) return "";

    if (typeof value === "number") {
      return value % 1 === 0
        ? value.toLocaleString()
        : value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
    } else if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    return value.toString();
  };

  return (
    <div
      ref={containerRef}
      className="data-grid-body"
      style={{ overflowX: "auto" }}
    >
      {/* Total height spacer to enable proper scrolling */}
      <div
        className="total-height-spacer"
        style={{ height: data.length * measuredRowHeight }}
      />

      {/* Rendered rows container with positioning */}
      <div
        className="virtual-rows-container"
        style={{
          position: "absolute",
          top: startIndex * measuredRowHeight,
          minWidth: totalColumnsWidth,
          transform: `translateX(-${scrollLeft}px)`,
          willChange: "transform", // Hint to browser to use GPU
        }}
      >
        {visibleRows.map((row, rowIndex) => (
          <div
            key={startIndex + rowIndex}
            className="data-grid-row"
            style={{ height: measuredRowHeight }}
          >
            {headers.map((header) => (
              <div
                key={header.id}
                className="data-grid-cell"
                style={{ width: header.width }}
              >
                {formatCellValue(row[header.id])}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataGridBody;
