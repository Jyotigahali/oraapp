import React, { useEffect, useState } from "react";
import axios from "axios";
import { Container, Row, Col, Button, Spinner } from "react-bootstrap";
import BootstrapTable from "react-bootstrap-table-next";
import paginationFactory from "react-bootstrap-table2-paginator";
import * as XLSX from "xlsx";
import 'bootstrap/dist/css/bootstrap.min.css';


function App() {
  const [files, setFiles] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [serialNo, setSerialNo] = useState(1);

  
  useEffect(() => {
    axios
      .get("http://localhost:3001/api/fetch-files")
      .then((response) => {
        setFiles(response.data);
        console.log("📁 Files:", response.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to fetch files");
        setLoading(false);
      });
  }, []);
  const handleFileClick = (fileId) => {
    axios
      // Inside handleFileClick, replace this part:

.get(`http://localhost:3001/api/fetch-sheets/${fileId}`)
.then((response) => {
  const sheetData = response.data;
  const sheetNames = Object.keys(sheetData);
  console.log("📄 Sheet Names:", sheetNames);

  const budgetSheetName =
    sheetNames.includes("Study Budget")
      ? "Study Budget"
      : sheetNames.includes("Internal Budget")
      ? "Internal Budget"
      : null;

  const specsSheetName = sheetNames.includes("Study Specs")
    ? "Study Specs"
    : null;

  if (!budgetSheetName) {
    setError("⚠️ Neither 'Study Budget' nor 'Internal Budget' sheet found.");
    return;
  }

  if (!specsSheetName) {
    setError("⚠️ 'Study Specs' sheet not found.");
    return;
  }

  const budgetSheet = sheetData[budgetSheetName];
  const studySpecsSheet = sheetData[specsSheetName];

  if (budgetSheet.length < 14) {
    setError(`⚠️ '${budgetSheetName}' sheet is too short.`);
    return;
  }

  const headerRowIndex = 1;
  const headers = budgetSheet[headerRowIndex].map((cell) =>
    cell && typeof cell === "object" && cell.result
      ? cell.result.toString().trim()
      : (cell || "").toString().trim()
  );

  const rows = budgetSheet.slice(headerRowIndex + 1);

  const getColIndex = (label) =>
    headers.findIndex(
      (h) => h?.toString().trim().toLowerCase() === label.toLowerCase()
    );

  const colIndex = {
    oraTask: getColIndex("Ora Task?"),
    service: getColIndex("Service"),
    units: getColIndex("# Units"),
    hrsPerUnit: getColIndex("Hrs per Unit"),
    totalHrs: getColIndex("Total Hrs"),
    resource: getColIndex("Resource"),
    phase: getColIndex("Phase"),
  };

  const missingCols = Object.entries(colIndex)
    .filter(([_, idx]) => idx === -1)
    .map(([key]) => key);

  if (missingCols.length > 0) {
    setError(`❌ Missing columns: ${missingCols.join(", ")}`);
    return;
  }

  const protocol = (studySpecsSheet?.[3]?.[1] || "").trim();

  const newRows = rows
    .filter(
      (row) =>
        row?.[colIndex.oraTask]?.toString().trim().toLowerCase() === "yes"
    )
    .map((row, index) => ({
      serialNo: serialNo + index,
      Protocol: protocol,
      Service: row[colIndex.service] || "",
      Units: row[colIndex.units] || "",
      HrsPerUnit: row[colIndex.hrsPerUnit] || "",
      TotalHrs: row[colIndex.totalHrs] || "",
      Resource: row[colIndex.resource] || "",
      Phase: row[colIndex.phase] || "",
    }));

  setSerialNo((prev) => prev + newRows.length);
  setTableData((prevData) => [...prevData, ...newRows]);
})
  }
  
  const columns = [
    { dataField: "serialNo", text: "S. No" },
    { dataField: "Protocol", text: "Protocol" },
    { dataField: "Service", text: "Service" },
    { dataField: "Units", text: "# Units" },
    { dataField: "HrsPerUnit", text: "Hrs per Unit" },
    { dataField: "TotalHrs", text: "Total Hrs" },
    { dataField: "Resource", text: "Resource" },
    { dataField: "Phase", text: "Phase" },
  ];

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "exported_data.xlsx");
  };

  if (loading) return <p>Loading files...</p>;
  if (error) return <p>{error}</p>;

  return (
    <Container fluid>
      <Row>
        <Col xs={2} className=" vh-100 p-4">
          <h5>SharePoint Files</h5>
          <ul style={{ listStyleType: "none", padding: 10 }}>
            {files.map((file) => (
              <li key={file.id} className="mb-2">
                <Button variant="outline-primary" size="sm" onClick={() => handleFileClick(file.id)}>
                 Name : {file.name} <br/>
                 id: {file.id}<br/>
                 Study ID: {file.oraStudyId}
                  
                </Button>
              </li>
            ))}
          </ul>
        </Col>

        <Col xs={10} className="p-6">
          {/* <h3>Aggregated Client Budget Data</h3> */}
          {tableData.length > 0 ? (
            <>
              <Button onClick={handleExport} className="btn btn-success mb-3">
                Export to Excel
              </Button>
              <BootstrapTable
                keyField="serialNo"
                data={tableData}
                columns={columns}
                bootstrap4
                striped
                hover
                condensed
                pagination={paginationFactory({ sizePerPage: 25 })}
              />
            </>
          ) : (
            <p>No data loaded. Click a file to load its budget data.</p>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default App;
