// EmployeeAutomation.js
import React, { useState } from 'react';
import { Table, Button, Row, Col, Alert } from 'react-bootstrap';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function EmployeeAutomation() {
  const [rmEmployees, setRmEmployees] = useState([]);
  const [adpEmployees, setAdpEmployees] = useState([]);
  const [processedEmployees, setProcessedEmployees] = useState([]);
  const [excludedEmployees, setExcludedEmployees] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [netSuiteEmployees, setNetSuiteEmployees] = useState([]);

  // File upload handler
  const handleFileUpload = (e, setFileData) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      setFileData(jsonData);
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  // Step 1: Handle Excluded Employees (Role="Exclude")
  // Step 1: Handle Excluded Employees FROM SANDBOX (RM)
  // Step 1: Handle Excluded Employees FROM SANDBOX (RM)
  // Also export the Exclusion File automatically
  const handleExclusions = () => {
    if (!rmEmployees.length) return;

    const excludes = rmEmployees.filter(
      emp => emp["Role"]?.toString().trim().toLowerCase() === "exclude"
    );

    const remainingRM = rmEmployees.filter(
      emp => emp["Role"]?.toString().trim().toLowerCase() !== "exclude"
    );

    // Update states
    setExcludedEmployees(excludes);
    setRmEmployees(remainingRM);

    // 🔥 If there are excluded employees, export them
    if (excludes.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(excludes);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "EmployeeExclusionList");

      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

      saveAs(
        new Blob([wbout], { type: "application/octet-stream" }),
        "Employee_Exclusion_List.xlsx"
      );
    }

    alert(`⚠️ ${excludes.length} Sandbox employees moved to Employee Exclusion list.`);
  };


  // Step 2: Map Role from Sandbox (RM) to ADP
  const mapRolesFromRM = () => {
    if (!adpEmployees.length || !rmEmployees.length) return;

    const createKey = (first, last, id) =>
      `${(first || "").toString().trim().toLowerCase()}|${(last || "")
        .toString()
        .trim()
        .toLowerCase()}|${(id || "").toString().trim().toLowerCase()}`;

    // Create RM lookup map
    const rmMap = new Map();

    rmEmployees.forEach(emp => {
      const key = createKey(
        emp["First Name"],
        emp["Last Name"],
        emp["Employee ID"]
      );
      rmMap.set(key, emp["Role"]);
    });

    // Update ADP employees
    const updatedADP = adpEmployees.map(emp => {
      const key = createKey(
        emp["Legal First Name"],
        emp["Legal Last Name"],
        emp["Associate ID"]
      );

      if (rmMap.has(key)) {
        // ✅ Match found → use RM role
        return {
          ...emp,
          Role: rmMap.get(key)
        };
      } else {
        // ❌ No match → mark as Unmapped
        return {
          ...emp,
          Role: "Unmapped"
        };
      }
    });

    setAdpEmployees(updatedADP);
    alert("✅ Roles mapped correctly from Sandbox.");
  };


  // Map ADP fields to output structure
  const mapADPEmployee = (adpEmp, rmEmp = {}) => {
    return {
      "First Name": adpEmp["Legal First Name"] || "",
      "Last Name": adpEmp["Legal Last Name"] || "",
      "Title": adpEmp["Job Title Description"] || "",
      "Role": adpEmp["Role"] || "",
      "Region": "",
      "Sub-Region": "",
      "Email": adpEmp["Work Contact: Work Email"] || "",
      "Employee ID": adpEmp["Associate ID"] || "",
      "Manager ID": "",
      "Cost Center": adpEmp["Home Department Description"] || "",
      "Work-time %": rmEmp["Work-time %"] || "100",
      "Billing Rate": rmEmp["Billing Rate"] || "",
      "Contractor": "",
      "Employee Type": adpEmp["Worker Category Description"] || "",
      "Position Status": adpEmp["Position Status"] || "",
      "Custom 1": adpEmp["Hire/Rehire Date"] || "",
      "Custom 2": adpEmp["Job Function Description"] || "",
      "Custom 3": rmEmp["Billable or Non-Billable or Partially Billable"] || "",
      "Custom 4": "",
      "Custom 5": "",
      "Active": "Yes"
    };
  };



  // Map RM Sandbox employee to output structure
  const mapRMEmployee = (rmEmp, activeValue = "No") => {
    return {
      "First Name": rmEmp["First Name"] || "",
      "Last Name": rmEmp["Last Name"] || "",
      "Title": rmEmp["Title"] || "",
      "Role": rmEmp["Role"] || "",
      "Region": rmEmp["Region"] || "",
      "Sub-Region": rmEmp["Sub-Region"] || "",
      "Email": rmEmp["Email"] || "",
      "Employee ID": rmEmp["Employee ID"] || "",
      "Manager ID": rmEmp["Manager ID"] || "",
      "Cost Center": rmEmp["Cost Center"] || "",
      "Work-time %": rmEmp["Work-time %"] || "",
      "Billing Rate": rmEmp["Billing Rate"] || "",
      "Contractor": rmEmp["Contractor"] || "",
      "Employee Type": rmEmp["Employee Type"] || "",
      "Position Status": rmEmp["Position Status"] || "",
      "Custom 1": rmEmp["Hire/Rehire Date"] || "",
      "Custom 2": rmEmp["Job Function Description"] || "",
      "Custom 3": rmEmp["Billable or Non-Billable or Partially Billable"] || "",
      "Custom 4": rmEmp["Custom 4"] || "",
      "Custom 5": rmEmp["Custom 5"] || "",
      "Active": activeValue
    };
  };

const updateFromNetSuite = () => {
  if (!netSuiteEmployees.length || !processedEmployees.length) {
    alert("Upload NetSuite and generate file first!");
    return;
  }

  const netSuiteMap = new Map();

  // Create a map keyed by ADP ID
  netSuiteEmployees.forEach(emp => {
    const rawId = emp["ADP ID"];
    if (rawId) {
      const key = String(rawId).trim().toUpperCase();
      netSuiteMap.set(key, emp);
    }
  });

  // Update processed employees
  const updatedEmployees = processedEmployees.map(emp => {
    const rawId = emp["Employee ID"];
    if (!rawId) return emp;

    const adpId = String(rawId).trim().toUpperCase();
    const nsRecord = netSuiteMap.get(adpId);

    if (nsRecord) {
      return {
        ...emp,
        "Cost Center": nsRecord["Service Line"]?.trim() || emp["Cost Center"],
        "Custom 3": nsRecord["Billable, Non-Billable or Partially Billable"]?.trim() || emp["Custom 3"],
        "Work-time %": nsRecord["FTE"]?.toString().trim() || emp["Work-time %"]  // ✅ Add FTE mapping here
      };
    }

    return emp;
  });

  setProcessedEmployees(updatedEmployees);
  alert("NetSuite mapping completed (Cost Center, Custom 3, and Work-time % updated).");
};
  // Step 3: Generate New Employee File
  // Step 3: Generate New Employee File
  const generateNewFile = () => {
    if (!rmEmployees.length || !adpEmployees.length) {
      alert("Please upload both RM Employee Master File and ADP New File first!");
      return;
    }

    // Helper to create comparison key (FN + LN + Role)
    const createKey = (first, last, role) =>
      `${(first || "").toString().trim().toLowerCase()}|${(last || "")
        .toString()
        .trim()
        .toLowerCase()}|${(role || "").toString().trim().toLowerCase()}`;

    // 1️⃣ Remove ADP employees that exist in exclusion list (by ADPID)
    const exclusionIds = new Set(
      excludedEmployees.map(emp =>
        emp["Employee ID"]?.toString().trim().toLowerCase()
      )
    );

    const filteredADPEmployees = adpEmployees.filter(emp =>
      !exclusionIds.has(
        emp["Associate ID"]?.toString().trim().toLowerCase()
      )
    );

    // 2️⃣ Create ADP map using FN + LN + Role
    const adpMap = new Map();

    filteredADPEmployees.forEach(emp => {
      const key = createKey(
        emp["Legal First Name"] || emp["First Name"],
        emp["Legal Last Name"] || emp["Last Name"],
        emp["Role"]
      );
      adpMap.set(key, emp);
    });

    const allProcessed = [];
    const matchedCount = [];
    const newFromADP = [];
    const rmUnmatched = [];

    // 3️⃣ Compare Sandbox → ADP
    rmEmployees.forEach(rmEmp => {
      const key = createKey(
        rmEmp["Legal First Name"] || rmEmp["First Name"],
        rmEmp["Last Name"],
        rmEmp["Role"]
      );

      if (adpMap.has(key)) {
        // ✅ Exists → copy ADP record
        const adpRecord = adpMap.get(key);
        const processed = mapADPEmployee(adpRecord);
        processed["Active"] = "Yes";
        processed._matched = true;
        processed._source = "ADP";

        allProcessed.push(processed);
        matchedCount.push(key);

        // Remove so we don’t double count
        adpMap.delete(key);
      } else {
        // ❌ Not exists → copy Sandbox record
        const processed = mapRMEmployee(rmEmp, "No");
        processed._matched = false;
        processed._source = "RM";

        allProcessed.push(processed);
        rmUnmatched.push(key);
      }
    });

    // 4️⃣ Remaining ADP records = NEW employees
    adpMap.forEach(adpEmp => {
      const newEmp = mapADPEmployee(adpEmp);
      newEmp["Active"] = "Yes";
      newEmp._isNew = true;
      newEmp._source = "ADP";

      allProcessed.push(newEmp);
      newFromADP.push(adpEmp["Associate ID"]);
    });

    setProcessedEmployees(allProcessed);

    setComparisonData({
      totalRM: rmEmployees.length,
      totalADP: filteredADPEmployees.length,
      matched: matchedCount.length,
      activeYes: matchedCount.length + newFromADP.length,
      activeNo: rmUnmatched.length,
      newFromADP: newFromADP.length,
      unmatchedRM: rmUnmatched.length,
      excluded: excludedEmployees.length
    });
  };

  // Export Employee File
  const exportNewFile = () => {
    if (!processedEmployees.length) {
      alert("No data to export! Please generate the file first.");
      return;
    }

    const exportData = processedEmployees.map(emp => {
      const { _matched, _source, _isNew, ...rest } = emp;
      return rest;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "EmployeeFile");

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'EmployeeFile_Processed.xlsx');
  };

  // Export Comparison Report
  const exportComparisonReport = () => {
    if (!comparisonData) {
      alert("Please generate the file first!");
      return;
    }

    const report = [
      ["Employee File Comparison Report"],
      [],
      ["Step", "Details", "Count"],
      ["Exclusions", "Role=Exclude employees", comparisonData.excluded || 0],
      ["RM Employees", "Total RM", comparisonData.totalRM],
      ["Matched RM in ADP", "Active = Yes", comparisonData.matched],
      ["Unmatched RM", "Active = No", comparisonData.unmatchedRM],
      ["New ADP Employees", "Added as Unmapped, Active = Yes", comparisonData.newFromADP],
      [],
      ["Final Output Summary"],
      ["Total Records", comparisonData.totalRM + comparisonData.newFromADP],
      ["Active = Yes", comparisonData.activeYes],
      ["Active = No", comparisonData.activeNo]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(report);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Comparison");

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'Comparison_Report.xlsx');
  };

  return (
    <div className="container mt-4">
      <h2>Employee Data Processing System</h2>

      <Row className="mb-3">
        <Col md={6}>
          <div className="border p-3 rounded">
            <h5>Step 1: Upload RM Employee Master File</h5>
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => handleFileUpload(e, setRmEmployees)}
              className="form-control"
            />
            {rmEmployees.length > 0 && <Alert variant="success">✓ Loaded {rmEmployees.length} RM employees</Alert>}
          </div>
        </Col>

        <Col md={6}>
          <div className="border p-3 rounded">
            <h5>Step 2: Upload ADP New File</h5>
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => handleFileUpload(e, setAdpEmployees)}
              className="form-control"
            />
            {adpEmployees.length > 0 && <Alert variant="success">✓ Loaded {adpEmployees.length} ADP employees</Alert>}
          </div>
        </Col>
        <Col md={6}>
          <div className="border p-3 rounded">
            <h5>Step 3: Upload NetSuite File</h5>
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => handleFileUpload(e, setNetSuiteEmployees)}
              className="form-control"
            />
            {netSuiteEmployees.length > 0 && (
              <Alert variant="success">
                ✓ Loaded {netSuiteEmployees.length} NetSuite employees
              </Alert>
            )}
          </div>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col>
          <Button
            variant="warning"
            onClick={handleExclusions}
            disabled={!rmEmployees.length}
          >
            Handle Exclusions (Role="Exclude")
          </Button>

          <Button variant="secondary" onClick={mapRolesFromRM} disabled={!adpEmployees.length || !rmEmployees.length} className="me-2">
            Map Roles from Sandbox
          </Button>
          <Button
            variant="dark"
            onClick={updateFromNetSuite}
            disabled={!netSuiteEmployees.length || !processedEmployees.length}
            className="me-2"
          >
            Update From NetSuite
          </Button>
          <Button variant="primary" onClick={generateNewFile} disabled={!rmEmployees.length || !adpEmployees.length} className="me-2">
            Generate New Employee File
          </Button>
          <Button variant="success" onClick={exportNewFile} disabled={!processedEmployees.length} className="me-2">
            Export Employee File
          </Button>
          <Button variant="info" onClick={exportComparisonReport} disabled={!comparisonData}>
            Export Comparison Report
          </Button>
        </Col>
      </Row>

      {processedEmployees.length > 0 && (
        <>
          <h4 className="mt-4">Processed Employee Data ({processedEmployees.length} total)</h4>
          <div style={{ overflowX: 'auto' }}>
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  {Object.keys(processedEmployees[0]).filter(key => !key.startsWith('_')).map((key, idx) => (
                    <th key={idx}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processedEmployees.map((row, idx) => {
                  let bgColor = '#ffffff';
                  if (row._isNew) bgColor = '#fff9e6';
                  else if (row._matched) bgColor = '#e8f5e9';
                  else if (row.Active === "No") bgColor = '#ffebee';

                  return (
                    <tr key={idx} style={{ backgroundColor: bgColor }}>
                      {Object.entries(row).filter(([key]) => !key.startsWith('_')).map(([_, val], idy) => (
                        <td key={idy}>{val ?? ''}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

export default EmployeeAutomation;
