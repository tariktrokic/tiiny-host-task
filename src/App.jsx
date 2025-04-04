import { useState } from "react";
import "./App.css";
import DataGrid from "./components/DataGrid";
import CSVUploader from "./components/CSVUploader";

function App() {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleCSVData = (csvData, csvHeaders) => {
    setData(csvData);
    setHeaders(csvHeaders);
  };

  return (
    <div className="app-container">
      <h1>CSV Data Grid Viewer</h1>

      <div className="uploader-container">
        <CSVUploader onDataLoaded={handleCSVData} setIsLoading={setIsLoading} />
      </div>

      <div className="grid-container">
        {isLoading ? (
          <div className="loading">Loading data...</div>
        ) : data.length > 0 ? (
          <DataGrid data={data} headers={headers} />
        ) : headers && headers.length > 0 ? (
          <div className="empty-state">
            <p>The CSV file is empty (contains headers but no data rows).</p>
            <p>Please try another file or use the sample file.</p>
          </div>
        ) : (
          <div className="empty-state">
            <p>Upload a CSV file to display data.</p>
            <p>
              Try the sample file:{" "}
              <a
                href="https://dev-test-csv.tiiny.co/SampleCSVFile_556kb.csv"
                target="_blank"
                rel="noopener noreferrer"
              >
                SampleCSVFile_556kb.csv
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
