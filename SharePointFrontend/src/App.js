import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Table, Button, Spinner, Pagination } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import Categories from "./Categories";

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
  const [invalidPhaseRows, setInvalidPhaseRows] = useState([]);



  // You can change this to 25, 50, etc.

  // After setting `data`, reset page to 1
  const updateData = (newData) => {
    console.log(newData);
    setData(newData);
    setCurrentPage(1);
  };
  // useEffect(() => {
  //   axios.get("http://localhost:3001/api/fetch-files")
  //     .then((response) => {
  //       // setFiles(response.data);
  //       console.log("📁 Files:", response.data);
  //       setLoading(false);
  //       setTimeout(() => {
  //         alert("All Active Files saved to system Downloads folder")
  //       }, 5000)
  //     })
  //     .catch((err) => {
  //       console.error(err);
  //       // setError("Failed to fetch files");
  //       setLoading(false);
  //     });
  // }, []);

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
          const study = row["Ora Project Code"]?.trim() || "";
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
        { phase: "Conduct", startLabel: "First Subject In", endLabel: "Last Subject Out" },
        { phase: "LTFU", startLabel: "Last Subject In", endLabel: "Last Subject Out" },
        { phase: "DBL", startLabel: "Last Subject Out", endLabel: "DBL" },
        { phase: "Closeout", startLabel: "DBL", endLabel: "Financially Closed" },
        { phase: "All", startLabel: "Protocol Approved", endLabel: "Financially Closed" },
      ];

      // Step 3: Inject plannedStart and plannedEnd into each data row
      // const newDataWithDates = data.map((row) => {
      //   const oraStudyId = row.oraStudyId?.trim();
      //   const phase = row.phase?.trim();

      //   const phaseRef = phaseDateReference.find(
      //     (ref) => ref.phase.toLowerCase() === phase?.toLowerCase()
      //   );

      //   if (!phaseRef) {
      //     return { ...row, plannedStart: "", plannedEnd: "" };
      //   }

      //   const { startLabel, endLabel } = phaseRef;

      //   const startMilestone = studyMilestones.find(
      //     (m) => m.study === oraStudyId && m.type === startLabel
      //   );
      //   const endMilestone = studyMilestones.find(
      //     (m) => m.study === oraStudyId && m.type === endLabel
      //   );

      //   return {
      //     ...row,
      //     plannedStart: startMilestone?.start || "",
      //     plannedEnd: endMilestone?.end || "",
      //   };
      // });
      const newDataWithDates = [];
      const unmatchedRows = [];

      data.forEach((row) => {
        const oraStudyId = row.oraStudyId?.trim();
        const phase = row.phase?.trim();

        const phaseRef = phaseDateReference.find(
          (ref) => ref.phase.toLowerCase() === phase?.toLowerCase()
        );

        if (!phaseRef) {
          unmatchedRows.push(row); // ✅ Keep only in unmatchedRows
          return; // ❌ Do not add to newDataWithDates
        }

        const { startLabel, endLabel } = phaseRef;

        const startMilestone = studyMilestones.find(
          (m) => m.study === oraStudyId && m.type === startLabel
        );
        const endMilestone = studyMilestones.find(
          (m) => m.study === oraStudyId && m.type === endLabel
        );

        newDataWithDates.push({
          ...row,
          plannedStart: startMilestone?.start || "",
          plannedEnd: endMilestone?.end || "",
        });
      });

      updateData(newDataWithDates);        // ✅ Final usable data with matched phases
      setInvalidPhaseRows(unmatchedRows);  // ✅ Rows with unknown/unmatched phases

      //updateData(newDataWithDates);
    } catch (err) {
      console.error("Error parsing milestone file:", err);
    }
  };



  const exportInvalidRowsToCSV = (rows, fileName = "unmatched_rows.csv") => {
    if (!rows || rows.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Unmatched Rows");

    XLSX.writeFile(workbook, fileName);
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
        NA: ["Canada", "Mexico", "United States"],
        MENA: ["Algeria", "Bahrain", "Egypt", "Iran", "Iraq", "Israel", "Jordan", "Kuwait", "Lebanon", "Libya", "Morocco", "Oman", "Palestine", "Qatar", "Saudi Arabia", "Syria", "Tunisia", "United Arab Emirates", "Yemen"],
        APAC: ["Afghanistan", "Australia", "Bangladesh", "Bhutan", "Brunei Darussalam", "Cambodia", "China", "Hong Kong (China)", "Macao (China)", "Cook Islands", "Democratic People's Republic of Korea", "Fiji", "India", "Indonesia", "Japan", "Kiribati", "Lao People's Democratic Republic", "Malaysia", "Maldives", "Marshall Islands"],
        LATAM: ["Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador", "Guyana", "Paraguay", "Peru", "Suriname", "Uruguay", "Venezuela", "Belize", "Costa Rica", "El Salvador", "Guatemala", "Honduras", "Nicaragua", "Panama"],
        EU: ["Austria", "Belgium", "Bulgaria", "Croatia", "Republic of Cyprus", "Czech Republic", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden"]
      };

      const dataWithExpandedCountryAndSite = [];

      data.forEach((row) => {
        const { resource = "", oraStudyId = "" } = row;
        const regionCode = resource.split("-")[1];
        const regionCountries = regionMap[regionCode];
        if (!regionCountries) {
          dataWithExpandedCountryAndSite.push(row);
          return;
        }

        const matchingEntries = countryTable.filter(entry =>
          entry["Study Number"]?.toString().trim() === oraStudyId?.toString().trim() &&
          entry["Site Status"]?.toLowerCase() === "active" &&
          regionCountries.includes(entry["Study Country"])
        );

        const countrySiteMap = {};
        matchingEntries.forEach(entry => {
          const country = entry["Study Country"]?.trim();
          if (country) {
            countrySiteMap[country] = (countrySiteMap[country] || 0) + 1;
          }
        });

        const countryList = Object.keys(countrySiteMap);
        const siteCountList = countryList.map(country => countrySiteMap[country]);

        if (countryList.length > 0) {
          countryList.forEach((country, i) => {
            dataWithExpandedCountryAndSite.push({
              ...row,
              country: country,
              site: siteCountList[i].toString()
            });
          });
        } else {
          dataWithExpandedCountryAndSite.push({
            ...row,
            country: "",
            site: ""
          });
        }
      });

      const finalData = [];

      dataWithExpandedCountryAndSite.forEach(row => {
        const { resource = "", oraStudyId = "", country = "", site = "" } = row;

        const [rolePrefix, regionCode] = resource.split("-");
        const isCRAType = rolePrefix === "CRA" || rolePrefix === "LCRA";

        if (isCRAType && site !== "0" && country) {
          const regionCountries = regionMap[regionCode];

          const matchingEntries = countryTable.filter(entry =>
            entry["Study Number"]?.toString().trim() === oraStudyId?.toString().trim() &&
            entry["Site Status"]?.toLowerCase() === "active" &&
            regionCountries?.includes(entry["Study Country"])
          );

          if (matchingEntries.length > 0) {
            matchingEntries.forEach(() => {
              finalData.push({
                ...row,
                country: country,
                site: "1"
              });
            });
          } else {
            finalData.push(row);
          }
        } else {
          finalData.push(row);
        }
      });

      console.log("🆕 Final data with CRA/LCRA detail rows applied:", finalData);

      // Step 2: Now call helper to calculate revisedDemand & update
      calculateRevisedDemand(finalData);

      // console.log("🔄 After country & site added:", dataWithExpandedCountryAndSite);

      // // Step 2: Now call helper to calculate revisedDemand & update
      // calculateRevisedDemand(dataWithExpandedCountryAndSite);
    };

    reader.readAsArrayBuffer(file);
  };

  // 🔹 Step 2 Helper: Calculate revisedDemand and updateData
  function calculateRevisedDemand(rows) {
    const updatedRows = [];
    const serviceMap = {};

    const cleanNumber = val => {
      if (val == null) return 0;
      const str = val.toString().replace(/[^0-9.\-]/g, '').trim();
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    };

    // Step 1: Group data per service to compute total sites and total hours
    rows.forEach(row => {
      const service = row.service?.trim();
      if (!service) return;

      const siteCount = cleanNumber(row.siteCount || row.sites || row.site || 1);
      const totalHrs = cleanNumber(row.totalHrs);

      if (!serviceMap[service]) {
        serviceMap[service] = {
          totalSites: 0,
          totalHours: 0
        };
      }

      serviceMap[service].totalSites += siteCount;
      serviceMap[service].totalHours += totalHrs;

      if (row.site || row.siteCount || row.sites || row.country) {
        serviceMap[service].hasSiteOrCountry = true;
      }

      console.log(`🛠 Service: ${service}, SiteCount: ${siteCount}, TotalHrs: ${totalHrs}`);
    });

    // Step 2: Calculate RevisedDemandFactor and RevisedDemand per row
    rows.forEach((row, index) => {
      const service = row.service?.trim();
      const resource = row.resource?.trim();
      const siteCount = cleanNumber(row.siteCount || row.sites || row.site || 1);
      const totalHrs = cleanNumber(row.totalHrs);

      const serviceData = serviceMap[service] || {};
      const totalSites = serviceData.totalSites || 0;

      let revisedDemandFactor = 0;
      let revisedDemand = 0;

      // 👇 New condition
      const isSiteZero = siteCount === 0;
      const isCountryMissing = row.country === undefined || row.country === null || row.country.toString().trim() === "";

      if (!(isSiteZero && isCountryMissing) && totalSites > 0) {
        revisedDemandFactor = siteCount / totalSites;
        revisedDemand = revisedDemandFactor * totalHrs;
      }

      console.log(`🔢 Row ${index + 1} | Service: ${service}, Resource: ${resource}`);
      console.log(`    → SiteCount: ${siteCount}, Total Sites: ${totalSites}, Total Hrs: ${totalHrs}`);
      console.log(`    → RevisedDemandFactor: ${revisedDemandFactor.toFixed(3)}, RevisedDemand: ${revisedDemand.toFixed(3)}`);

      updatedRows.push({
        ...row,
        slno: index + 1,
        //revisedDemandFactor: revisedDemandFactor.toFixed(3),
        revisedDemand: revisedDemand.toFixed(3),
        //countryDemand: revisedDemand.toFixed(3),
        totalSites: totalSites,
        totalServiceHrs: serviceData.totalHours.toFixed(2)
      });
    });


    console.log("✅ Final Output Rows:", updatedRows);
    updateData(updatedRows); // Update table or UI with new data
  }


  const handleScheduleLevelMilestoneUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "buffer" });

      // ✅ Find the correct sheet name
      const sheetName = workbook.SheetNames.find(name =>
        name.trim().toLowerCase() === "records_as_of_2025_05_01_edt"
      );

      if (!sheetName) {
        alert("Sheet 'records_as_of_2025_05_01_EDT' not found!");
        return;
      }

      const worksheet = workbook.Sheets[sheetName];

      // ✅ Step 1: Read and clean column headers (trim spaces)
      const rawMilestoneData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      const milestoneData = rawMilestoneData.map(entry => {
        const cleanedEntry = {};
        Object.keys(entry).forEach(key => {
          cleanedEntry[key.trim()] = entry[key]; // removes spaces
        });
        return cleanedEntry;
      });

      // 🧪 Debug: log keys to see exact column names
      console.log("📋 Milestone Columns:", Object.keys(milestoneData[0]));

      // ✅ Step 2: Build map using "Study Number"
      const milestoneMap = {};
      milestoneData.forEach(entry => {
        const studyNumber = (entry["Study Number"] || "").toString().trim();
        if (studyNumber) milestoneMap[studyNumber] = entry;
      });

      // ✅ Step 3: Merge milestone fields into your data
      const updatedWithMilestones = data.map(row => {
        const studyId = (row.oraStudyId || "").toString().trim();
        const match = milestoneMap[studyId];

        return {
          ...row,
          Department: match?.["Department"] || "",
          Sponsor: match?.["Sponsor"] || "",
          currentProjectStatus: match?.["Current Project Phase"] || "",
          Indication: match?.["Indication Picklist"] || "",
          enrollmentMethod: match?.["Enrollment Method"] || "",
          studyNumber: match?.["Study Number"] || "",
          therapeuticArea: match?.["Therapeutic Area"] || "",
          noOfSites: match?.["Number of Sites"] || "",
          noOfCountries: match?.["Country"].split(',').length || 0,
          nameOfCountries: match?.["Country"] || "",
        };
      });

      updateData(updatedWithMilestones);
      console.log("✅ Updated data with Schedule-Level Milestone columns", updatedWithMilestones);
    } catch (err) {
      console.error("❌ Error reading schedule milestone file:", err);
    }
  };



  return (
    <div className="container mt-4">
      <h3>Import Excel Files</h3>
      <input type="file" multiple accept=".xlsx,.xls" onChange={handleFileUpload} />
      {loading && <Spinner animation="border" className="mt-3" />}
      <div className="mt-3">
        <label><strong>Upload Milestone File</strong></label>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleMilestoneUpload} />
      </div>
      <div className="mt-3">
        <label><strong>Upload studty Country</strong></label>
        <input type="file" accept=".csv, .xlsx,.xls" onChange={handleStudyCountry} />
      </div>
      <div className="mt-3">
        <label><strong>Upload Study File</strong></label>
        <input type="file" accept=".xlsx,.xls, .csv" onChange={handleStudyUpload} />
      </div>
      <div className="mt-3">
        <label><strong>Upload Schedule Level Milestone</strong></label>
        <input type="file" accept=".xlsx,.xls, .csv" onChange={handleScheduleLevelMilestoneUpload} />
      </div>
      <Categories errorFile={invalidPhaseRows} currentData={data} loading={loading} currentPage={currentPage} setCurrentPage={setCurrentPage} />
      {!loading && data.length === 0 && <p className="mt-3">No data loaded yet.</p>}
    </div>
  );
}

export default App;