# CSV Data Grid

A performance-focused data grid component that renders large CSV files efficiently while scrolling. This application allows you to upload and visualize CSV data with a smooth user experience, even for files with thousands of rows.

## Features

### Core Functionality

- ✅ Upload and process CSV files
- ✅ Virtualized rendering for handling large datasets (10,000+ rows) with smooth scrolling
- ✅ Fixed/sticky header row
- ✅ Sortable columns (click on column headers to sort)
- ✅ Resizable columns (drag the right edge of column headers)
- ✅ Custom cell rendering for different data types (numbers, text)
- ✅ Responsive design

### Performance Optimizations

- ✅ Row virtualization (only rendering visible rows)
- ✅ Efficient window resize handling
- ✅ Optimized scroll performance

## How to Run the Project

### Prerequisites

- Node.js (14.x or later) or Bun

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:

```
bun install
# or
npm install
```

4. Start the development server:

```
bun run dev
# or
npm run dev
```

5. Open your browser and navigate to http://localhost:5173

## Usage

1. Click "Choose CSV File" to upload your own CSV file or use the "Use Sample CSV" button to load the sample dataset.
2. Once loaded, you can:
   - Sort columns by clicking on the column headers
   - Resize columns by dragging the edge of a column header
   - Scroll through the data with virtualized rendering for performance

## Implementation Details

### Performance Techniques

- **Row Virtualization**: Only renders rows that are visible in the viewport, plus a small buffer to ensure smooth scrolling
- **Efficient DOM Updates**: Minimizes DOM manipulations for optimal performance
- **Debounced Resize Handling**: Prevents excessive re-renders during window resize operations

### Component Structure

- **App**: Main application component
- **CSVUploader**: Handles file uploads and CSV parsing
- **DataGrid**: Core grid component
- **DataGridHeader**: Implements fixed/sticky headers with sorting and resizing
- **DataGridBody**: Implements virtualized row rendering for optimal performance

## Sample Data

The application includes functionality to load a sample CSV file from:
https://dev-test-csv.tiiny.co/SampleCSVFile_556kb.csv
