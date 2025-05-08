import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Table, Button, Spinner, Pagination } from "react-bootstrap";
import { saveAs } from "file-saver";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateMap, setDateMap] = useState({});

  const rowsPerPage = 100; // You can change this to 25, 50, etc.

  // After setting `data`, reset page to 1
  const updateData = (newData) => {
    setData(newData);
    setCurrentPage(1);
  };

  // ... your handleFileUpload remains the same, just call `updateData(flatData)` instead of `setData(flatData)`
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setLoading(true);
    const allData = [];

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "buffer" });

        const sheetNames = workbook.SheetNames.map((name) => name.toLowerCase());
        const budgetSheetName =
          sheetNames.find((s) => s.includes("study budget")) ||
          sheetNames.find((s) => s.includes("internal budget"));
        const specsSheetName = sheetNames.find((s) => s.includes("study specs"));

        if (!budgetSheetName || !specsSheetName) {
          console.warn(`Missing expected sheets in file: ${file.name}`);
          continue;
        }

        const budgetSheet = workbook.Sheets[workbook.SheetNames.find(name =>
          name.toLowerCase() === budgetSheetName)];
        const specsSheet = workbook.Sheets[workbook.SheetNames.find(name =>
          name.toLowerCase() === specsSheetName)];

        const budgetJson = XLSX.utils.sheet_to_json(budgetSheet, { defval: "" });
        const filteredBudget = budgetJson.filter(
          (row) => (row["ora task?"] || row["Ora Task?"] || "").toString().toLowerCase() === "yes"
        );

        const specsRange = XLSX.utils.sheet_to_json(specsSheet, {
          header: 1,
          defval: "",
        });

        const protocolRow = specsRange[3]; // 4th row (0-indexed)
        const protocolIndex = protocolRow?.findIndex((cell) =>
          (cell || "").toString().toLowerCase().includes("protocol")
        );
        const protocolValue = protocolIndex >= 0 ? protocolRow[protocolIndex + 1] : "N/A";

        filteredBudget.forEach((row, index) => {
          allData.push({
            slno: allData.length + 1,
            protocol: protocolValue,
            service: row["Service"] || "",
            units: row["# Units"] || "",
            hrsPerUnit: row["Hrs per Unit"] || "",
            totalHrs: row["Total Hrs"] || "",
            resource: row["Resource"] || "",
            phase: row["Phase"] || "",
          });
        });
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    updateData(allData); // This will set data and reset page to 1
    setLoading(false);
  };

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = data.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(data.length / rowsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Export");
    const wbout = XLSX.write(wb, { bookType: "csv", type: "array" });
    saveAs(new Blob([wbout], { type: "text/csv;charset=utf-8;" }), "export.csv");
  };

  const handleMilestoneUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "buffer" });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      // Normalize keys
      const rows = json.map((row) => ({
        type: row["Milestone Type"] || row["Milestone type"] || "",
        start: row["Planned Start Date"] || row["Planned start date"] || "",
        end: row["Planned Finish Date"] || row["Planned finish date"] || "",
      })).filter(r => r.type && r.start && r.end);

      // Parse valid date strings
      const allStartDates = rows.map(r => new Date(r.start)).filter(d => !isNaN(d));
      const allEndDates = rows.map(r => new Date(r.end)).filter(d => !isNaN(d));

      const earliestStart = new Date(Math.min(...allStartDates));
      const latestEnd = new Date(Math.max(...allEndDates));

      const map = {};

      for (const row of rows) {
        const key = row.type.toLowerCase().trim();
        if (!map[key]) {
          map[key] = {
            start: row.start,
            end: row.end,
          };
        }
      }

      // Inject new date columns into your data
      const newData = data.map((row) => {
        const key = row.phase?.toLowerCase()?.trim();
        const match = map[key];
        return {
          ...row,
          plannedStart: match?.start || earliestStart.toISOString().split("T")[0],
          plannedEnd: match?.end || latestEnd.toISOString().split("T")[0],
        };
      });

      setDateMap(map);  // Optional, in case you want to reuse later
      updateData(newData); // Reset to page 1
    } catch (err) {
      console.error("Error parsing milestone file:", err);
    }
  };


  return (
    <div className="container mt-4">
      <h3>Import Excel Files</h3>
      <input type="file" multiple accept=".xlsx,.xls" onChange={handleFileUpload} />
      {loading && <Spinner animation="border" className="mt-3" />}
      <div className="mt-3">
        <label><strong>Upload Milestone File</strong></label>
        <input type="file" accept=".xlsx,.xls" onChange={handleMilestoneUpload} />
      </div>


      {data.length > 0 && !loading && (
        <>
          <Button className="my-3" onClick={exportToCSV}>
            Export as CSV
          </Button>

          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Sl. No</th>
                <th>Protocol</th>
                <th>Service</th>
                <th># Units</th>
                <th>Hrs per Unit</th>
                <th>Total Hrs</th>
                <th>Resource</th>
                <th>Phase</th>
                <th>Planned Start Date</th>
                <th>Planned Finish Date</th>
              </tr>
            </thead>

            <tbody>
              {currentRows.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.slno}</td>
                  <td>{row.protocol}</td>
                  <td>{row.service}</td>
                  <td>{row.units}</td>
                  <td>{row.hrsPerUnit}</td>
                  <td>{row.totalHrs}</td>
                  <td>{row.resource}</td>
                  <td>{row.phase}</td>
                  <td>{row.plannedStart || ""}</td>
                  <td>{row.plannedEnd || ""}</td>
                </tr>
              ))}
            </tbody>

          </Table>

          <Pagination>
            <Pagination.First disabled={currentPage === 1} onClick={() => handlePageChange(1)} />
            <Pagination.Prev disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} />
            {[...Array(totalPages).keys()].map((number) => (
              <Pagination.Item
                key={number + 1}
                active={number + 1 === currentPage}
                onClick={() => handlePageChange(number + 1)}
              >
                {number + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} />
            <Pagination.Last disabled={currentPage === totalPages} onClick={() => handlePageChange(totalPages)} />
          </Pagination>
        </>
      )}

      {!loading && data.length === 0 && <p className="mt-3">No data loaded yet.</p>}
    </div>
  );
}

export default App;
