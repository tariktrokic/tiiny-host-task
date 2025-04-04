import React, { useState, useEffect, useRef, useMemo } from "react";
import "./DataGrid.css";
import _ from "lodash";
import { ROW_HEIGHT } from "../constants";

/**
 * Performance optimizations:
 * 1. Uses IntersectionObserver instead of scroll events (reduces main thread work)
 * 2. Only renders visible rows (reduces DOM size)
 * 3. Uses transform for positioning (triggers composite-only repaints)
 * 4. Uses memoization for row generation (reduces re-renders)
 * 5. Employs absolute positioning for buffer rows (keeps DOM layout stable)
 */
const VirtualizedRows = ({
  data,
  headers,
  visibleRowsCount,
  scrollTop,
  totalWidth,
}) => {
  const containerRef = useRef(null);
  const topSentinelRef = useRef(null);
  const bottomSentinelRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({
    startIndex: 0,
    endIndex: visibleRowsCount,
  });

  // Use effect to update visible range when scrollTop changes
  useEffect(() => {
    // Calculate indices based on the current scroll position
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT));
    const endIndex = Math.min(data.length, startIndex + visibleRowsCount + 2);

    setVisibleRange({ startIndex, endIndex });

    // Log virtualization metrics for debugging
    console.log("Virtualization update:", {
      scrollTop,
      startIndex,
      endIndex,
      visibleCount: endIndex - startIndex,
    });
  }, [scrollTop, visibleRowsCount, data.length]);

  // Setup IntersectionObserver for sentinel elements
  useEffect(() => {
    // Skip if refs aren't ready
    if (
      !topSentinelRef.current ||
      !bottomSentinelRef.current ||
      !containerRef.current
    ) {
      return;
    }

    // Get parent scrollable element
    const scrollableParent = containerRef.current.closest(
      ".data-grid-body-container"
    );
    if (!scrollableParent) return;

    /**
     * IntersectionObserver callback - triggered when sentinels enter/exit viewport
     * This is more efficient than scroll events because:
     * 1. It's not called on every scroll pixel movement
     * 2. It's optimized by the browser and runs off the main thread when possible
     * 3. It naturally throttles updates based on visibility
     */
    const handleIntersection = (entries) => {
      entries.forEach((entry) => {
        // Early return if not intersecting
        if (!entry.isIntersecting) return;

        // When top sentinel is visible, load more rows above
        if (
          entry.target === topSentinelRef.current &&
          visibleRange.startIndex > 0
        ) {
          setVisibleRange((prev) => ({
            startIndex: Math.max(0, prev.startIndex),
            endIndex: prev.endIndex,
          }));
        }

        // When bottom sentinel is visible, load more rows below
        if (
          entry.target === bottomSentinelRef.current &&
          visibleRange.endIndex < data.length
        ) {
          setVisibleRange((prev) => ({
            startIndex: prev.startIndex,
            endIndex: Math.min(data.length, prev.endIndex),
          }));
        }
      });
    };

    // Create IntersectionObserver with options
    // rootMargin adds additional area around viewport to start loading earlier
    const options = {
      root: scrollableParent,
      rootMargin: `${ROW_HEIGHT * 2}px 0px`,
      threshold: 0.1, // Trigger when at least 10% of sentinel is visible
    };

    const observer = new IntersectionObserver(handleIntersection, options);

    // Observe both sentinel elements
    observer.observe(topSentinelRef.current);
    observer.observe(bottomSentinelRef.current);

    // Cleanup function to disconnect observer when component unmounts
    return () => observer.disconnect();
  }, [data.length, visibleRange]);

  // Calculate total height for scrollbar and layout
  const totalHeight = data.length * ROW_HEIGHT;

  // Calculate offset for visible rows (for transform positioning)
  const offsetY = visibleRange.startIndex * ROW_HEIGHT;

  // Slice only the data we need to render (performance optimization)
  const visibleData = useMemo(
    () => data.slice(visibleRange.startIndex, visibleRange.endIndex),
    [data, visibleRange.startIndex, visibleRange.endIndex]
  );

  // Memoize row generation to prevent unnecessary re-renders
  const visibleRows = useMemo(() => {
    return visibleData.map((row, index) => {
      const actualIndex = visibleRange.startIndex + index;
      return (
        <div
          className="data-grid-row"
          key={actualIndex}
          style={{ height: ROW_HEIGHT, width: totalWidth }}
        >
          {headers.map((header) => (
            <div
              className="data-grid-cell"
              key={`${actualIndex}-${header.id}`}
              style={{ width: header.width }}
            >
              {row[header.id] === undefined ? "" : row[header.id]}
            </div>
          ))}
        </div>
      );
    });
  }, [visibleData, headers, visibleRange.startIndex, totalWidth]);

  // Debug output shows how many rows are actually being rendered
  console.log("Virtualized rows rendering:", {
    dataLength: data.length,
    visibleDataLength: visibleData.length,
    visibleRange,
    offsetY,
    totalHeight,
  });

  return (
    <div
      ref={containerRef}
      className="virtualized-rows-container"
      style={{
        height: totalHeight,
        position: "relative",
        width: totalWidth,
      }}
    >
      {/* Top sentinel element to detect when we need to load more rows above */}
      <div
        ref={topSentinelRef}
        style={{
          position: "absolute",
          top: Math.max(0, visibleRange.startIndex * ROW_HEIGHT - ROW_HEIGHT),
          height: "2px",
          width: "100%",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />

      {/* Container for visible rows with transform for GPU acceleration */}
      <div
        className="virtualized-rows"
        style={{
          transform: `translateY(${offsetY}px)`,
          willChange: "transform", // Hint to browser to use GPU
        }}
      >
        {visibleRows}
      </div>

      {/* Bottom sentinel element to detect when we need to load more rows below */}
      <div
        ref={bottomSentinelRef}
        style={{
          position: "absolute",
          top: Math.min(
            totalHeight,
            visibleRange.endIndex * ROW_HEIGHT + ROW_HEIGHT
          ),
          height: "2px",
          width: "100%",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />
    </div>
  );
};

export default VirtualizedRows;
