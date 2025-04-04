import React, { useState, useRef, useEffect } from "react";
import "./DataGrid.css";

const DataGridHeader = ({
  headers,
  onSort,
  sortConfig,
  onResize,
  totalColumnsWidth,
  scrollLeft,
}) => {
  const [resizingColumn, setResizingColumn] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const headerRefs = useRef({});

  // Track header elements for use in resize operations
  useEffect(() => {
    headers.forEach((header) => {
      if (!headerRefs.current[header.id]) {
        headerRefs.current[header.id] = React.createRef();
      }
    });
  }, [headers]);

  const handleSortClick = (headerId) => {
    // Find the header
    const header = headers.find((h) => h.id === headerId);
    if (!header.sortable) return;

    onSort(headerId);
  };

  const renderSortIcon = (headerId) => {
    if (sortConfig.key !== headerId) return null;

    return (
      <span className="sort-icon">
        {sortConfig.direction === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  const handleResizeStart = (e, headerId) => {
    e.stopPropagation(); // Prevent sorting when resize handle is clicked

    // Find the header
    const header = headers.find((h) => h.id === headerId);
    if (!header.resizable) return;

    setResizingColumn(headerId);
    setStartX(e.clientX);
    setStartWidth(header.width);

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
  };

  const handleResizeMove = (e) => {
    if (!resizingColumn) return;

    const header = headers.find((h) => h.id === resizingColumn);
    const diff = e.clientX - startX;
    let newWidth = Math.max(
      header.minWidth,
      Math.min(header.maxWidth, startWidth + diff)
    );

    // Update width in real-time for visual feedback
    if (headerRefs.current[resizingColumn]?.current) {
      headerRefs.current[resizingColumn].current.style.width = `${newWidth}px`;
    }
  };

  const handleResizeEnd = (e) => {
    if (!resizingColumn) return;

    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);

    const header = headers.find((h) => h.id === resizingColumn);
    const diff = e.clientX - startX;
    let newWidth = Math.max(
      header.minWidth,
      Math.min(header.maxWidth, startWidth + diff)
    );

    onResize(resizingColumn, newWidth);
    setResizingColumn(null);
  };

  return (
    <div
      className="data-grid-header"
      style={{
        minWidth: totalColumnsWidth,
        transform: `translateX(-${scrollLeft}px)`,
      }}
    >
      {headers.map((header) => (
        <div
          key={header.id}
          ref={headerRefs.current[header.id]}
          className={`data-grid-header-cell ${
            header.sortable ? "sortable" : ""
          }`}
          style={{ width: header.width }}
          onClick={() => handleSortClick(header.id)}
        >
          <div className="header-content">
            {header.name}
            {renderSortIcon(header.id)}
          </div>
          {header.resizable && (
            <div
              className="resize-handle"
              onMouseDown={(e) => handleResizeStart(e, header.id)}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default DataGridHeader;
