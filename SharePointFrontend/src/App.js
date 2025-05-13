import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Table, Button, Spinner, Pagination } from "react-bootstrap";
import { saveAs } from "file-saver";
import "bootstrap/dist/css/bootstrap.min.css";
import axios from "axios";

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  //const [dateMap, setDateMap] = useState({});
  const [studyMilestones, setStudyMilestones] = useState([]); // New state for milestones
  //const [phaseTable, setPhaseTable] = useState([]); // New state for phase table
  const [studyData, setStudyData] = useState([]);
  const [studyCountry, setStudyCountry] = useState([]); // New state for study country
  const [resourceData, setResourceData] = useState([]);
const [expandedData, setExpandedData] = useState([]);


  const rowsPerPage = 100; // You can change this to 25, 50, etc.

  // After setting `data`, reset page to 1
  const updateData = (newData) => {
    console.log(newData);
    setData(newData);
    setCurrentPage(1);
  };
  useEffect(() => {
    axios.get("http://localhost:3001/api/fetch-files")
      .then((response) => {
        // setFiles(response.data);
        console.log("📁 Files:", response.data);
        setLoading(false);
        setTimeout(() => {
          alert("All Active Files saved to system Downloads folder")
        }, 5000)
      })
      .catch((err) => {
        console.error(err);
        // setError("Failed to fetch files");
        setLoading(false);
      });
  }, []);

  // ... your handleFileUpload remains the same, just call `updateData(flatData)` instead of `setData(flatData)`
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setLoading(true);
    const allData = [];

    for (const file of files) {
      console.log(`Processing file: ${file.name}`);
      console.log('setStudyData', studyData);

      // Lookup Ora Study ID from studyData using file name
      const studyMatch = studyData.find(
        (s) => (s["File Name"] || "").trim().toLowerCase() === file.name.trim().toLowerCase()
      );
      const oraStudyId = studyMatch ? studyMatch["Ora Study ID"] : "N/A";

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


        const filteredBudget = budgetJson.filter((row) => {
          const oraTask = (row["ora task?"] || row["Ora Task?"] || "").toString().toLowerCase() === "yes";
          const totalHrs = parseFloat(row["Total Hrs"]);
          return oraTask && !isNaN(totalHrs) && totalHrs > 0;
        });



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
            fileName: file.name,
            oraStudyId: oraStudyId,
            service: row["Service"] || "",
            units: row["# Units"] || row["Units"] || "",
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

    console.log(allData); // Final processed data with fileName and oraStudyId
    updateData(allData);
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

      const json = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        cellDates: true,
      });

      // Excel date parser
      const parseExcelDate = (value) => {
        if (typeof value === "number") {
          const date = XLSX.SSF.parse_date_code(value);
          if (!date) return "";
          const iso = new Date(Date.UTC(date.y, date.m - 1, date.d)).toISOString();
          return iso.split("T")[0];
        }
        if (value instanceof Date) {
          return value.toISOString().split("T")[0];
        }
        return "";
      };

      // Step 1: Parse milestone rows
      const studyMilestones = json
        .map((row) => {
          const study = row["Study"]?.trim() || "";
          const type = row["Milestone Type"] || row["Milestone type"] || "";
          const start = parseExcelDate(row["Planned Start Date"] || row["Planned start date"]);
          const end = parseExcelDate(row["Planned Finish Date"] || row["Planned finish date"]);
          return { study, type: type.trim(), start, end };
        })
        .filter((r) => r.study && r.type && r.start && r.end);

      setStudyMilestones(studyMilestones); // Optional for debugging

      // Step 2: Reference table to match phases
      const phaseDateReference = [
        { phase: "Startup", startLabel: "Protocol Approved", endLabel: "First Subject In" },
        { phase: "Counduct", startLabel: "First Subject In", endLabel: "Last Subject Out" },
        { phase: "LTFU", startLabel: "Last Subject In", endLabel: "Last Subject Out" },
        { phase: "DBL", startLabel: "Last Subject Out", endLabel: "DBL" },
        { phase: "Closeout", startLabel: "DBL", endLabel: "Financially Closed" },
        { phase: "All", startLabel: "Protocol Approved", endLabel: "Financially Closed" },
      ];

      // Step 3: Inject plannedStart and plannedEnd into each data row
      const newDataWithDates = data.map((row) => {
        const oraStudyId = row.oraStudyId?.trim();
        const phase = row.phase?.trim();

        const phaseRef = phaseDateReference.find(
          (ref) => ref.phase.toLowerCase() === phase?.toLowerCase()
        );

        if (!phaseRef) {
          return { ...row, plannedStart: "", plannedEnd: "" };
        }

        const { startLabel, endLabel } = phaseRef;

        const startMilestone = studyMilestones.find(
          (m) => m.study === oraStudyId && m.type === startLabel
        );
        const endMilestone = studyMilestones.find(
          (m) => m.study === oraStudyId && m.type === endLabel
        );

        return {
          ...row,
          plannedStart: startMilestone?.start || "",
          plannedEnd: endMilestone?.end || "",
        };
      });

      updateData(newDataWithDates);
    } catch (err) {
      console.error("Error parsing milestone file:", err);
    }
  };

  const handleStudyUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      setStudyData(jsonData); // <-- Save data to state
    };

    reader.readAsArrayBuffer(file);
  }

 const handleStudyCountry = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    const dataBuffer = new Uint8Array(e.target.result);
    const workbook = XLSX.read(dataBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const countryTable = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    setStudyCountry(countryTable);
    console.log("📁 Study Country Data:", countryTable);

    const regionMap = {
      "NA": ["Canada", "Mexico", "United States"],
      "MENA": ["Algeria", "Bahrain", "Egypt", "Iran", "Iraq", "Israel", "Jordan", "Kuwait", "Lebanon", "Libya", "Morocco", "Oman", "Palestine", "Qatar", "Saudi Arabia", "Syria", "Tunisia", "United Arab Emirates", "Yemen"],
      "APAC": ["Afghanistan", "Australia", "Bangladesh", "Bhutan", "Brunei Darussalam", "Cambodia", "China", "Hong Kong (China)", "Macao (China)", "Cook Islands", "Democratic People's Republic of Korea", "Fiji", "India", "Indonesia", "Japan", "Kiribati", "Lao People's Democratic Republic", "Malaysia", "Maldives", "Marshall Islands"],
      "LATAM": ["Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador", "Guyana", "Paraguay", "Peru", "Suriname", "Uruguay", "Venezuela", "Belize", "Costa Rica", "El Salvador", "Guatemala", "Honduras", "Nicaragua", "Panama"],
      "EU": ["Austria", "Belgium", "Bulgaria", "Croatia", "Republic of Cyprus", "Czech Republic", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden"]
    };

    const updatedRows = [];

    data.forEach((row) => {
      const { resource = "", oraStudyId = "" } = row;
      const regionCode = resource.split("-")[1]; // e.g., NA from CTA-NA

      if (regionCode && regionMap[regionCode]) {
        const countries = regionMap[regionCode];

        const matchingRows = countryTable.filter(entry =>
          entry["Study Number"]?.toString().trim() === oraStudyId?.toString().trim() &&
          entry["Site Status"]?.toLowerCase() === "active" &&
          countries.includes(entry["Study Country"])
        );

        if (matchingRows.length > 0) {
          matchingRows.forEach(entry => {
            updatedRows.push({
              ...row,
              slno: updatedRows.length+1,
              country: entry["Study Country"],
              site: entry["Study Site Number"],
              revisedDemand: "" // Optional placeholder
            });
          });
        } else {
          // No matching country row – can optionally add original without change
        }
      } else {
        // Region not found in Resource – can optionally skip or include
      }
    });

    updateData(updatedRows);
    console.log("✅ Updated Data with Countries:", updatedRows);
  };

  reader.readAsArrayBuffer(file);
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
       <div className="mt-3">
        <label><strong>Upload studty Country</strong></label>
        <input type="file" accept=".csv, .xlsx,.xls" onChange={handleStudyCountry} />
      </div>
      <div className="mt-3">
        <label><strong>Upload Study File</strong></label>
        <input type="file" accept=".xlsx,.xls" onChange={handleStudyUpload} />
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
                <th>ora Study ID</th>
                <th>Service</th>
                <th># Units</th>
                <th>Hrs per Unit</th>
                <th>Total Hrs</th>
                <th>Resource</th>
                <th>Phase</th>
                <th>Planned Start Date</th>
                <th>Planned Finish Date</th>
                <th>Country</th>
                <th>Site</th>
                <th>Revised Demand</th>
              </tr>
            </thead>

            <tbody>
              {currentRows.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.slno}</td>
                  <td>{row.protocol}</td>
                  <td>{row.oraStudyId}</td>
                  <td>{row.service}</td>
                  <td>{row.units}</td>
                  <td>{row.hrsPerUnit}</td>
                  <td>{row.totalHrs}</td>
                  <td>{row.resource}</td>
                  <td>{row.phase}</td>
                  <td>{row.plannedStart || ""}</td>
                  <td>{row.plannedEnd || ""}</td>
                  <td>{row.country || ""}</td>
                  <td>{row.site || ""}</td> 

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