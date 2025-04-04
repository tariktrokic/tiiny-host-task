import { useState, useRef } from "react";
import Papa from "papaparse";
import "./DataGrid.css";
import { SAMPLE_CSV_NAME, SAMPLE_CSV_URL } from "../constants";

const CSVUploader = ({ onDataLoaded, setIsLoading }) => {
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);

  const parseCSV = (csvText) => {
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn("CSV parsing had errors:", results.errors);
          }

          // Format headers for the DataGrid component
          const headers = results.meta.fields.map((field) => ({
            id: field,
            name: field,
            width: 150,
            minWidth: 50,
            maxWidth: 500,
            resizable: true,
            sortable: true,
          }));

          resolve({ headers, data: results.data });
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    try {
      const text = await file.text();
      const { headers, data } = await parseCSV(text);
      onDataLoaded(data, headers);
    } catch (error) {
      console.error("Error parsing CSV file:", error);
      alert("Error parsing CSV file. Please try another file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSampleClick = async () => {
    setIsLoading(true);
    setFileName(SAMPLE_CSV_NAME);

    try {
      const response = await fetch(SAMPLE_CSV_URL);
      const text = await response.text();
      const { headers, data } = await parseCSV(text);
      onDataLoaded(data, headers);
    } catch (error) {
      console.error("Error fetching sample CSV:", error);
      alert("Error fetching sample CSV. Please try uploading a file instead.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="csv-uploader-container">
      <div className="csv-uploader">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          ref={fileInputRef}
          id="csv-file-input"
          className="file-input"
        />
        <label htmlFor="csv-file-input" className="file-input-label">
          Choose CSV File
        </label>
        <button onClick={handleSampleClick} className="sample-button">
          Use Sample CSV
        </button>
      </div>
      {fileName && <span className="file-name">{fileName}</span>}
    </div>
  );
};

export default CSVUploader;
