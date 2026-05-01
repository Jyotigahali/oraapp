import React, { useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";



function TimesheetAutomation() {
    const [netSuiteData, setNetSuiteData] = useState([]);
    const [employeeData, setEmployeeData] = useState([]);
    const [finalData, setFinalData] = useState([]);
    const [budgetData, setBudgetData] = useState([]);


    const formatExcelDate = (value) => {
        if (!value) return "";

        // If Excel serial number
        if (typeof value === "number") {
            const parsed = XLSX.SSF.parse_date_code(value);
            if (!parsed) return value;

            const d = new Date(parsed.y, parsed.m - 1, parsed.d);
            return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        }

        // If already a date string
        const d = new Date(value);
        if (!isNaN(d)) {
            return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        }

        return value;
    };
    // Generic file reader (CSV + XLSX)
    const readFile = (file, callback) => {
        const fileType = file.name.split(".").pop().toLowerCase();

        if (fileType === "csv") {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (result) => callback(result.data),
            });
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                const workbook = XLSX.read(e.target.result, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(sheet);
                callback(data);
            };
            reader.readAsBinaryString(file);
        }
    };

    // Import NetSuite file
    const handleNetSuiteImport = (e) => {
        const file = e.target.files[0];
        readFile(file, (data) => {
            setNetSuiteData(data);
            alert("NetSuite file loaded");
        });
    };

    // Import Employee file
    const handleEmployeeImport = (e) => {
        const file = e.target.files[0];
        readFile(file, (data) => {
            setEmployeeData(data);
            alert("Employee file loaded");
        });
    };

    const cleanId = (val) => {
        if (!val) return "";
        return String(val).replace(".0", "").trim();
    };

    const handleProcess = () => {
        if (!netSuiteData.length || !employeeData.length) {
            alert("Please upload both files first");
            return;
        }

        const employeeMap = {};

        employeeData.forEach((emp) => {
            const empId = cleanId(emp["Employee ID"]);
            employeeMap[empId] = emp["Role"];
        });

        const updated = netSuiteData.map((row) => {
            const adpId = cleanId(row["ADP ID"]);
            const role = employeeMap[adpId];

            return {
                ...row,
                Role: role ? role : "Not Found",
            };
        });

        // ⭐⭐⭐ IMPORTANT LINE
        setNetSuiteData(updated);   // <-- update main data

        const worksheet = XLSX.utils.json_to_sheet(updated);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Updated NetSuite");
        XLSX.writeFile(workbook, "NetSuite_With_Role.xlsx");

        alert("Role added and NetSuite data updated!");
    };
    const handleBudgetImport = (e) => {
        const file = e.target.files[0];
        readFile(file, (data) => {
            setBudgetData(data);
            alert("Budget ETL file loaded");
        });
    };
    const parseDate = (dateValue) => {
        if (!dateValue) return null;
        if (typeof dateValue === "number") {
            const parsed = XLSX.SSF.parse_date_code(dateValue);
            return parsed ? new Date(parsed.y, parsed.m - 1, parsed.d) : null;
        }
        return new Date(dateValue);
    };

    const handleAddPhase = () => {
        if (!netSuiteData.length || !budgetData.length) {
            alert("Please load NetSuite and Budget files");
            return;
        }

        const updated = netSuiteData.map((row) => {
            const projectNumber = (row["Project Number"] || "").toString().trim();
            const tsDate = parseDate(row["Date"]);

            let phase = "";

            if (projectNumber && tsDate) {
                const matchedRows = budgetData.filter(d =>
                    d.oraStudyId?.toString().trim().toLowerCase() === projectNumber.toLowerCase() &&
                    d.phase && d.phase.trim().toLowerCase() !== "all"
                );

                for (let match of matchedRows) {
                    const plannedStart = parseDate(match.plannedStart);
                    const plannedEnd = parseDate(match.plannedEnd);

                    if (plannedStart && plannedEnd) {
                        const tsMonth = tsDate.getMonth();
                        const tsYear = tsDate.getFullYear();

                        const startMonth = plannedStart.getMonth();
                        const startYear = plannedStart.getFullYear();
                        const endMonth = plannedEnd.getMonth();
                        const endYear = plannedEnd.getFullYear();

                        const afterStart = tsYear > startYear || (tsYear === startYear && tsMonth >= startMonth);
                        const beforeEnd = tsYear < endYear || (tsYear === endYear && tsMonth <= endMonth);

                        if (afterStart && beforeEnd) {
                            phase = match.phase;
                            break;
                        }
                    }
                }
            }

            return {
                ...row,
                Phase: phase || "Project",
            };
        });
        setNetSuiteData(updated);

        const worksheet = XLSX.utils.json_to_sheet(updated);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "NetSuite Final");
        XLSX.writeFile(workbook, "NetSuite_With_Role_And_Phase.xlsx");

        alert("Phase added and file downloaded!");
    };

    const handleAddWorkItem = () => {
        if (!netSuiteData.length || !budgetData.length) {
            alert("Please load NetSuite and Budget files");
            return;
        }

        // Create lookup from Budget: oraStudyId -> studyNumber
        const studyMap = {};
        budgetData.forEach(b => {
            const key = (b.oraStudyId || "").toString().trim().toLowerCase();
            studyMap[key] = b.studyNumber;
        });

        const updated = netSuiteData.map(row => {
            const projectNumber = (row["Project Number"] || "").toString().trim();
            const studyNumber = studyMap[projectNumber.toLowerCase()] || "";

            const workItem = studyNumber
                ? `${projectNumber} - ${studyNumber}`
                : "Not Found";

            // ⭐ Put WorkItem as FIRST column
            return {
                WorkItem: workItem,
                ...row,
            };
        });

        // Update master state
        setNetSuiteData(updated);

        const worksheet = XLSX.utils.json_to_sheet(updated);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "NetSuite Final");
        XLSX.writeFile(workbook, "NetSuite_With_Role_Phase_WorkItem.xlsx");

        alert("WorkItem added as first column and file downloaded!");
    };

    const handleRemoveBlankProject = () => {
        if (!netSuiteData.length) {
            alert("Please load NetSuite data first");
            return;
        }

        const updated = netSuiteData.filter(row =>
            row["Project Number"] &&
            row["Project Number"].toString().trim() !== ""
        );

        setNetSuiteData(updated);

        const worksheet = XLSX.utils.json_to_sheet(updated);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cleaned Data");
        XLSX.writeFile(workbook, "No_Blank_ProjectNumber.xlsx");

        alert("Blank Project Number rows removed!");
    };

    const handleRemoveBlankRole = () => {
        if (!netSuiteData.length) {
            alert("Please process Role first");
            return;
        }

        const updated = netSuiteData.filter(row =>
            row["Role"] &&
            row["Role"].toString().trim() !== "" &&
            row["Role"] !== "Not Found"
        );

        setNetSuiteData(updated);

        const worksheet = XLSX.utils.json_to_sheet(updated);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cleaned Data");
        XLSX.writeFile(workbook, "No_Blank_Role.xlsx");

        alert("Blank Role rows removed!");
    };
    const handleRemoveNotFoundWorkItem = () => {
        if (!netSuiteData.length) {
            alert("Please generate WorkItem first");
            return;
        }

        const updated = netSuiteData.filter(row =>
            row["WorkItem"] &&
            row["WorkItem"].toString().trim() !== "" &&
            row["WorkItem"] !== "Not Found"
        );

        setNetSuiteData(updated);

        const worksheet = XLSX.utils.json_to_sheet(updated);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cleaned Data");
        XLSX.writeFile(workbook, "No_NotFound_WorkItem.xlsx");

        alert("Rows with WorkItem 'Not Found' removed!");
    };
    const handleSumHours = () => {
        if (!netSuiteData || netSuiteData.length === 0) {
            alert("No data available");
            return;
        }

        const groupTotals = {};

        // Step 1: Calculate totals
        netSuiteData.forEach((row) => {
            const key = [
                row["Project Number"],
                row["Phase"],
                row["Role"],
                row["ADP ID"],
            ].join("|");

            const hours = parseFloat(row["Hours"] || 0);

            if (!groupTotals[key]) {
                groupTotals[key] = 0;
            }

            groupTotals[key] += hours;
        });

        // Step 2: Add Sum Hours to every row
        const updatedData = netSuiteData.map((row) => {
            const key = [
                row["Project Number"],
                row["Phase"],
                row["Role"],
                row["ADP ID"],
            ].join("|");

            return {
                ...row,
                "Sum Hours": groupTotals[key],
            };
        });

        // Step 3: Update state
        setNetSuiteData(updatedData);

        // Step 4: Download file
        const worksheet = XLSX.utils.json_to_sheet(updatedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sum Hours");
        XLSX.writeFile(workbook, "Step3_SumHours.xlsx");

        alert("Sum Hours added and file downloaded!");
    };
    const handleAddValue = () => {
        if (!netSuiteData.length) {
            alert("Please calculate Sum Hours first");
            return;
        }

        const updated = netSuiteData.map(row => {
            const sumHours = parseFloat(row["Sum Hours"] || 0);
            const value = (sumHours / 151.55).toFixed(6);

            return {
                ...row,
                Value: value
            };
        });

        setNetSuiteData(updated);

        const finalDownloadData = updated.map(row => ({
            "WorkItem": row["WorkItem"],
            "Phase": row["Phase"],
            "Date": formatExcelDate(row["Date"]),   // ✅ FIXED
            "Role": row["Role"],
            "Value": row["Value"],
            "Project Number": row["Project Number"],
            "Employee": row["Employee"]
        }));

        const worksheet = XLSX.utils.json_to_sheet(finalDownloadData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Final Data");
        XLSX.writeFile(workbook, "Final_Timesheet_Output.xlsx");

        alert("Final file downloaded with required columns!");
    };

    const getBeginEndOfMonth = (value) => {
        if (!value) return { begin: "", end: "" };

        let date;

        // Excel serial number support
        if (typeof value === "number") {
            const parsed = XLSX.SSF.parse_date_code(value);
            if (!parsed) return { begin: "", end: "" };
            date = new Date(parsed.y, parsed.m - 1, parsed.d);
        } else {
            date = new Date(value);
        }

        if (isNaN(date)) return { begin: "", end: "" };

        const year = date.getFullYear();
        const month = date.getMonth();

        const begin = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0); // last day of month

        return {
            begin,
            end
        };
    };

    const handleAddBeginEnd = () => {
        if (!netSuiteData.length) {
            alert("No data available");
            return;
        }

        const updated = netSuiteData.map((row) => {
            const { begin, end } = getBeginEndOfMonth(row["Date"]);

            const dateObj = typeof row["Date"] === "number"
                ? XLSX.SSF.parse_date_code(row["Date"])
                : new Date(row["Date"]);

            const month =
                dateObj && !isNaN(new Date(dateObj))
                    ? new Date(dateObj).toLocaleString("default", { month: "long" })
                    : "";

            return {
                "WorkItem-Final": row["WorkItem"] || "",
                "Phase": row["Phase"],
                "Month": month,
                "Begin": begin ? formatExcelDate(begin) : "",
                "End": end ? formatExcelDate(end) : "",
                "Role": row["Role"],
                "Value": row["Value"],
                "Project Number": row["Project Number"],
                "ADP ID": row["ADP ID"],
                "Employee": row["Employee"],
            };
        });

        setNetSuiteData(updated);

        const worksheet = XLSX.utils.json_to_sheet(updated);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Final Output");

        XLSX.writeFile(workbook, "Final_Timesheet_With_Begin_End.xlsx");

        alert("Final file generated successfully!");
    };
    const handleRemoveZeroValues = () => {
        if (!netSuiteData.length) {
            alert("No data available");
            return;
        }

        const filtered = netSuiteData
            .filter((row) => {
                const value = parseFloat(row["Value"] || 0);
                return value !== 0;
            })
            .map((row) => ({
                "WorkItem-Final": row["WorkItem-Final"],
                "Phase": row["Phase"],
                "Begin": row["Begin"],
                "End": row["End"],
                "Role": row["Role"],
                "Value": row["Value"],
                "Project Number": row["Project Number"],
                "ADP ID": row["ADP ID"],
                "Employee": row["Employee"],
            }));

        setNetSuiteData(filtered);

        const worksheet = XLSX.utils.json_to_sheet(filtered);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "No Zero Values");

        XLSX.writeFile(workbook, "Timesheet_No_Zero_Values.xlsx");

        alert("Rows with 0 Value removed successfully!");
    };
    const handleFilterGroupedRows = () => {
        if (!netSuiteData.length) {
            alert("No data available");
            return;
        }

        const groupMap = {};

        netSuiteData.forEach((row) => {
            const key = [
                row["WorkItem-Final"],
                row["Phase"],
                row["Begin"],
                row["End"],
                row["Role"],
                row["Project Number"],
                row["ADP ID"],
                row["Employee"],
            ].join("|");

            if (!groupMap[key]) {
                groupMap[key] = {
                    "WorkItem-Final": row["WorkItem-Final"],
                    "Phase": row["Phase"],
                    "Begin": row["Begin"],
                    "End": row["End"],
                    "Role": row["Role"],
                    "Value": row["Value"],   // ✅ KEEP SAME VALUE (NO SUM)
                    "Project Number": row["Project Number"],
                    "ADP ID": row["ADP ID"],
                    "Employee": row["Employee"],
                };
            }
        });

        const result = Object.values(groupMap);

        setNetSuiteData(result);

        const worksheet = XLSX.utils.json_to_sheet(result);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Grouped Rows");

        XLSX.writeFile(workbook, "Step4_Grouped_NoValueChange.xlsx");

        alert("Rows grouped successfully (Value unchanged)!");
    };
    const handleFinalColumnMapping = () => {
        if (!netSuiteData.length) {
            alert("No data available");
            return;
        }

        const updated = netSuiteData.map((row) => {
            return {
                "WorkItem": row["WorkItem-Final"] || "",
                "Activity": row["Phase"] || "",
                "Begin": row["Begin"] || "",

                "End": row["End"] || "",
                "Role": row["Role"] || "",

                "Complexity": "",   // not available yet
                "Value": row["Value"] || "",

                "CID": "",
                "MID": "",
                "MIM": "",

                "_OraProject ID": row["Project Number"] || "",
                "_ADP ID": row["ADP ID"] || "",
                "_Employee Name": row["Employee"] || ""
            };
        });

        setNetSuiteData(updated);

        const worksheet = XLSX.utils.json_to_sheet(updated);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Final Mapping");

        XLSX.writeFile(workbook, "Final_Column_Mapped_Output.xlsx");

        alert("Final column mapping completed!");
    };
    return (
        <div className="container-fluid p-4 bg-light min-vh-100">

            {/* HEADER */}
            <div className="card shadow-sm p-3 mb-4">
                <h3 className="mb-0">Timesheet Automation</h3>
            </div>

            {/* IMPORT SECTION */}
            <div className="card shadow-sm p-3 mb-4">
                <h5 className="mb-3">Step 1 - Import Files</h5>

                <div className="row g-3">

                    <div className="col-md-6">
                        <label className="form-label">NetSuite File</label>
                        <input
                            className="form-control"
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleNetSuiteImport}
                        />
                    </div>

                    <div className="col-md-6">
                        <label className="form-label">Employee File</label>
                        <input
                            className="form-control"
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleEmployeeImport}
                        />
                    </div>

                </div>

                <div className="mt-3">
                    <button className="btn btn-primary" onClick={handleProcess}>
                        Add Role & Download File
                    </button>
                </div>
            </div>

            {/* PROCESSING SECTION */}
            <div className="card shadow-sm p-3 mb-4">
                <h5 className="mb-3">Step 2 - Budget & Transformations</h5>

                <div className="row g-3">

                    <div className="col-md-6">
                        <label className="form-label">Budget ETL File</label>
                        <input
                            className="form-control"
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleBudgetImport}
                        />
                    </div>

                </div>

                <div className="d-flex flex-wrap gap-2 mt-3">

                    <button className="btn btn-outline-primary" onClick={handleAddPhase}>
                        Add Phase
                    </button>

                    <button className="btn btn-outline-primary" onClick={handleAddWorkItem}>
                        Add WorkItem
                    </button>

                    <button className="btn btn-outline-danger" onClick={handleRemoveBlankProject}>
                        Remove Blank Project
                    </button>

                    <button className="btn btn-outline-danger" onClick={handleRemoveBlankRole}>
                        Remove Blank Role
                    </button>

                    <button className="btn btn-outline-warning" onClick={handleRemoveNotFoundWorkItem}>
                        Remove Not Found WorkItem
                    </button>

                </div>
            </div>

            {/* FINAL STEP SECTION */}
            <div className="card shadow-sm p-3">

                <h5 className="mb-3">Step 3 - Final Calculations</h5>

                <div className="d-flex flex-wrap gap-2">

                    <button className="btn btn-success" onClick={handleSumHours}>
                        Calculate Sum Hours
                    </button>

                    <button className="btn btn-success" onClick={handleAddValue}>
                        Add Value
                    </button>
                    <button className="btn btn-success" onClick={handleAddBeginEnd}>
                        Add Begin & End Date
                    </button>
                    <button className="btn btn-danger" onClick={handleRemoveZeroValues}>
                        Remove 0 Value Rows
                    </button>
                    <button className="btn btn-primary" onClick={handleFilterGroupedRows}>
                        Filter Grouped Rows & Download
                    </button>
                    <button className="btn btn-dark" onClick={handleFinalColumnMapping}>
                        Final Column Mapping
                    </button>

                </div>

            </div>

        </div>
    );
}

export default TimesheetAutomation;