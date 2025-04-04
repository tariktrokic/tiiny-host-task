import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import "./DataGrid.css";
import _ from "lodash";
import { ROW_HEIGHT } from "../constants";
import VirtualizedRows from "./VirtualizedRows";

/**
 * Performance optimizations:
 * 1. Uses ResizeObserver for efficient size monitoring
 * 2. Employs MutationObserver to track DOM changes
 * 3. Memoizes expensive calculations
 * 4. Uses IntersectionObserver for virtualization (via VirtualizedRows)
 * 5. Optimizes scroll handling with passive events
 * 6. Uses React.memo to prevent unnecessary re-renders
 */
const DataGrid = React.memo(({ data, headers: initialHeaders }) => {
  const [headers, setHeaders] = useState(initialHeaders);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [scrollPosition, setScrollPosition] = useState({ top: 0, left: 0 });

  // Refs for DOM access
  const containerRef = useRef(null);
  const bodyRef = useRef(null);
  const headerRef = useRef(null);
  const mutationObserverRef = useRef(null);

  // Calculate visible rows based on container height
  const visibleRowsCount = useMemo(
    () => Math.max(10, Math.ceil((dimensions.height || 300) / ROW_HEIGHT)),
    [dimensions.height]
  );

  // Memoize sorted data to prevent unnecessary sorts
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    // Using Lodash for efficient sorting
    return _.orderBy(data, [sortConfig.key], [sortConfig.direction]);
  }, [data, sortConfig.key, sortConfig.direction]);

  // Memoize total width calculation
  const totalColumnsWidth = useMemo(() => _.sumBy(headers, "width"), [headers]);

  /**
   * ResizeObserver effect - monitors size changes without causing layout thrashing
   * This is more efficient than listening to window resize events because:
   * 1. It only triggers on actual size changes of the observed element
   * 2. It's more accurate than manual calculations
   * 3. It avoids synchronous layout recalculation
   */
  useEffect(() => {
    if (!containerRef.current) return;

    // Debounce resize handler to avoid excessive updates
    const resizeObserver = new ResizeObserver(
      _.debounce((entries) => {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });

        console.log("Resize detected:", { width, height });
      }, 50) // 50ms debounce is good balance between responsiveness and performance
    );

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  /**
   * MutationObserver effect - monitors DOM changes that might affect layout
   * This helps ensure our virtualization calculations stay accurate when:
   * 1. DOM elements are added/removed
   * 2. Styles or attributes affecting size change
   * 3. Class changes occur that might affect layout
   */
  useEffect(() => {
    if (!containerRef.current) return;

    // Create mutation observer to watch for changes that might affect size
    const mutationObserver = new MutationObserver(
      _.debounce((mutations) => {
        // Check if relevant mutations occurred (class changes, style changes)
        const relevantMutation = mutations.some(
          (mutation) =>
            mutation.type === "attributes" &&
            (mutation.attributeName === "class" ||
              mutation.attributeName === "style")
        );

        if (relevantMutation && bodyRef.current) {
          // Force recalculation when relevant changes occur
          console.log("Relevant DOM mutation detected - recalculating layout");

          // Trigger scroll event to recalculate visible area
          bodyRef.current.dispatchEvent(new Event("scroll"));
        }
      }, 50)
    );

    // Watch for attribute and child list changes
    mutationObserver.observe(containerRef.current, {
      attributes: true,
      attributeFilter: ["class", "style"],
      childList: true,
      subtree: true,
    });

    // Store ref for use in cleanup
    mutationObserverRef.current = mutationObserver;

    return () => {
      mutationObserver.disconnect();
    };
  }, []);

  // Reset scrolling state when data changes
  useEffect(() => {
    if (bodyRef.current) {
      // Reset scroll position when data set changes
      bodyRef.current.scrollTop = 0;
      setScrollPosition({ top: 0, left: scrollPosition.left });
      console.log("Data changed - resetting scroll position");
    }
  }, [data.length]);

  /**
   * Optimized scroll handler using passive events and minimal state updates
   * Performance improvements:
   * 1. Uses passive events (improves scroll performance)
   * 2. Only updates necessary state (reduces renders)
   * 3. Only synchronizes what's needed (horizontal scrolling)
   */
  const handleScroll = useCallback((e) => {
    if (e.target === bodyRef.current) {
      const { scrollTop, scrollLeft } = e.target;

      // Use functional updates to avoid stale closures
      setScrollPosition((prev) => {
        // Skip update if nothing changed
        if (prev.top === scrollTop && prev.left === scrollLeft) {
          return prev;
        }
        return { top: scrollTop, left: scrollLeft };
      });

      // Sync header scroll horizontally
      if (headerRef.current && headerRef.current.scrollLeft !== scrollLeft) {
        // Use passive scrolling for performance
        headerRef.current.scrollLeft = scrollLeft;
      }
    } else if (e.target === headerRef.current) {
      const { scrollLeft } = e.target;

      // Only update horizontal scroll from header (vertical stays the same)
      setScrollPosition((prev) => {
        if (prev.left === scrollLeft) return prev;
        return { ...prev, left: scrollLeft };
      });

      // Sync body scroll horizontally
      if (bodyRef.current && bodyRef.current.scrollLeft !== scrollLeft) {
        bodyRef.current.scrollLeft = scrollLeft;
      }
    }
  }, []);

  // Add passive event listeners for better scroll performance
  useEffect(() => {
    if (!bodyRef.current || !headerRef.current) return;

    // Using passive: true improves scroll performance by indicating
    // we won't call preventDefault(), allowing browser optimizations
    const scrollOptions = { passive: true };

    // Add event listeners
    bodyRef.current.addEventListener("scroll", handleScroll, scrollOptions);
    headerRef.current.addEventListener("scroll", handleScroll, scrollOptions);

    return () => {
      // Clean up event listeners
      bodyRef.current?.removeEventListener("scroll", handleScroll);
      headerRef.current?.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll, bodyRef.current, headerRef.current]);

  // 3-state column sorting with memoized callback
  const handleSort = useCallback((key) => {
    setSortConfig((prevConfig) => {
      if (prevConfig.key === key) {
        if (prevConfig.direction === "asc") {
          return { key, direction: "desc" };
        } else if (prevConfig.direction === "desc") {
          return { key: null, direction: "asc" };
        }
      }
      return { key, direction: "asc" };
    });
  }, []);

  // Column resizing with memoized callback
  const handleColumnResize = useCallback((columnId, newWidth) => {
    setHeaders((prevHeaders) =>
      prevHeaders.map((header) =>
        header.id === columnId ? { ...header, width: newWidth } : header
      )
    );
  }, []);

  // Empty state check
  if (_.isEmpty(data) || _.isEmpty(headers)) {
    return <div className="data-grid-empty">No data to display</div>;
  }

  return (
    <div className="data-grid-container" ref={containerRef}>
      {/* Header with synchronized scrolling */}
      <div
        className="data-grid-header-container"
        ref={headerRef}
        style={{ overflowX: "auto" }}
      >
        <div
          className="data-grid-header"
          style={{
            width: totalColumnsWidth,
            willChange: "transform", // Hint to browser for GPU acceleration
          }}
        >
          {headers.map((header) => (
            <div
              key={header.id}
              className={`data-grid-header-cell ${
                header.sortable ? "sortable" : ""
              }`}
              style={{ width: header.width }}
              onClick={() => header.sortable && handleSort(header.id)}
            >
              <div className="header-content">
                <span>{header.name}</span>
                {sortConfig.key === header.id && (
                  <span className="sort-icon">
                    {sortConfig.direction === "asc" ? "▲" : "▼"}
                  </span>
                )}
              </div>
              {header.resizable && (
                <div
                  className="resize-handle"
                  onMouseDown={(e) => {
                    const startX = e.clientX;
                    const startWidth = header.width;
                    const containerRect =
                      containerRef.current.getBoundingClientRect();

                    const handleMouseMove = (moveEvent) => {
                      const diff = moveEvent.clientX - startX;
                      const newWidth = _.clamp(startWidth + diff, 50, 500);

                      handleColumnResize(header.id, newWidth);

                      // Auto-scroll when resizing to the edge of the container
                      if (
                        moveEvent.clientX > containerRect.right - 20 &&
                        headerRef.current.scrollLeft <
                          headerRef.current.scrollWidth -
                            headerRef.current.clientWidth
                      ) {
                        headerRef.current.scrollLeft += 10;
                      }
                    };

                    const handleMouseUp = () => {
                      document.removeEventListener(
                        "mousemove",
                        handleMouseMove
                      );
                      document.removeEventListener("mouseup", handleMouseUp);
                    };

                    // Use capture phase for mouse events for more reliable tracking
                    document.addEventListener("mousemove", handleMouseMove, {
                      passive: false,
                    });
                    document.addEventListener("mouseup", handleMouseUp);

                    e.preventDefault();
                    e.stopPropagation();
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Body with virtualized rows for performance */}
      <div
        className="data-grid-body-container"
        ref={bodyRef}
        style={{
          flex: 1,
          minHeight: "100px",
          position: "relative",
          overflowY: "auto",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
        }}
      >
        <VirtualizedRows
          data={sortedData}
          headers={headers}
          visibleRowsCount={visibleRowsCount}
          scrollTop={scrollPosition.top}
          totalWidth={totalColumnsWidth}
        />
      </div>

      <div className="data-grid-footer">
        {data.length.toLocaleString()} rows
      </div>
    </div>
  );
});

export default DataGrid;
