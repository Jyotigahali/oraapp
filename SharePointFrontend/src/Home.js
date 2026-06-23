import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Spinner, } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import Categories from "./Categories";
import { useNavigate } from "react-router-dom";



function App() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    //const [dateMap, setDateMap] = useState({});
    // const [studyMilestones, setStudyMilestones] = useState([]); // New state for milestones
    //const [phaseTable, setPhaseTable] = useState([]); // New state for phase table
    const [studyData, setStudyData] = useState([]);
    const [studyCountry, setStudyCountry] = useState([]); // New state for study country
    const [invalidPhaseRows, setInvalidPhaseRows] = useState([]);
    const [cradata, setCraData] = useState([]);
    const [excludedOraStudyIds, setExcludedOraStudyIds] = useState([]);
    const [roleMapping, setRoleMapping] = useState({});
    //const[updatedDataAfter, setUpdatedDataAfter]= useState([])
    const [timeSheetData, setTimeSheetData] = useState([]);


    const PHASE_ORDER = ["Startup", "Conduct", "LTFU", "DBL", "Closeout"];
    const navigate = useNavigate();


    // You can change this to 25, 50, etc.

    // After setting `data`, reset page to 1
    const updateData = (newData) => {
        console.log(newData);
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
            console.log(`Processing file: ${file.name}`);
            // console.log('setStudyData', studyData);

            // Lookup Ora Study ID from studyData using file name
            const studyMatch = studyData.find(
                (s) => (s["File Name"] || "").trim().toLowerCase() === file.name.trim().toLowerCase()
            );
            const oraStudyId = studyMatch ? studyMatch["Ora Study ID"] : "N/A";
            console.log("exclodedOraStudyIds", excludedOraStudyIds);
            if (excludedOraStudyIds.includes(oraStudyId)) {
                console.log(`Skipping excluded OraStudyId: ${oraStudyId} in file: ${file.name}`);
                continue;
            }

            try {
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: "buffer" });

                const sheetNames = workbook.SheetNames.map((name) => name.toLowerCase());
                const budgetSheetName =
                    sheetNames.find((s) => s.includes("study budget")) ||
                    sheetNames.find((s) => s.includes("internal budget"));
                const specsSheetName = sheetNames.find((s) => s.includes("study specs"));

                if (!budgetSheetName) {
                    console.warn(`Missing expected sheets in file: ${file.name}`);
                    continue;
                }
                let protocolValue = "N/A";
                const budgetSheet = workbook.Sheets[workbook.SheetNames.find(name =>
                    name.toLowerCase() === budgetSheetName)];

                const specsSheet = specsSheetName
                    ? workbook.Sheets[workbook.SheetNames.find(name =>
                        name.toLowerCase() === specsSheetName)]
                    : null;

                const budgetJson = XLSX.utils.sheet_to_json(budgetSheet, { defval: "" });

                const filteredBudget = budgetJson.filter((row) => {
                    const resource = (row["Resource"] || "").toString().trim();
                    const phase = (row["Phase"] || "").toString().trim();
                    const totalHrs = parseFloat(row["Total Hrs"]);
                    return resource && phase && !isNaN(totalHrs) && totalHrs > 0;
                });

                if (specsSheet) {
                    const specsRange = XLSX.utils.sheet_to_json(specsSheet, {
                        header: 1,
                        defval: "",
                    });

                    const protocolRow = specsRange[3]; // 4th row (0-indexed)
                    const protocolIndex = protocolRow?.findIndex((cell) =>
                        (cell || "").toString().toLowerCase().includes("protocol")
                    );
                    protocolValue = protocolIndex >= 0 ? protocolRow[protocolIndex + 1] : "N/A";
                }

                filteredBudget.forEach((row, index) => {

                    const rawResource = (row["Resource"] || "").toString().trim();
                    const normalizedResource = rawResource.toLowerCase();
                    if (!roleMapping[normalizedResource]) {
                        console.warn(`⏭️ Skipping unmapped role: "${rawResource}" in file ${file.name}`);
                        return;
                    }
                    const standardizedResource = roleMapping[normalizedResource];

                    //  Now split standardized resource into role + region
                    const [rawRole, rawRegion] = standardizedResource.includes("-")
                        ? standardizedResource.split("-")
                        : [standardizedResource, ""];

                    const role = rawRole.trim();
                    const region = rawRegion.trim() || "NA"; // Default to NA if region is blank
                    const finalResource = `${role}-${region}`;

                    const phaseRaw = (row["Phase"] || "").toString().trim();

                    // Normalize phase: make 'closeout' (in any case) into 'Closeout'
                    const phase = phaseRaw.toLowerCase() === "closeout" ? "Closeout" : phaseRaw;
                    allData.push({
                        slno: allData.length + 1,
                        protocol: protocolValue,
                        fileName: file.name,
                        oraStudyId: oraStudyId,
                        service: (row["Service"] || "").toString().trim(),
                        units: (row["# Units"] || row["Units"] || "").toString().trim(),
                        hrsPerUnit: (row["Hrs per Unit"] || "").toString().trim(),
                        totalHrs: (row["Total Hrs"] || "").toString().trim(),
                        resource: standardizedResource,
                        originalResource: rawResource,
                        role: role,
                        region: region,
                        finalResource: finalResource,
                        phase: phase,
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

            const cleanDate = (val) => {
                const date = parseExcelDate(val);
                return (!date || date.startsWith("1900")) ? "" : date;
            };

            // Function to get milestone date for normal phases
            const getDateByPriority = (milestone) => {
                return (
                    cleanDate(milestone["Actual Start Date"]) ||
                    cleanDate(milestone["Actual Finish Date"]) ||
                    cleanDate(milestone["Planned Start Date"]) ||
                    cleanDate(milestone["Planned Finish Date"])
                );
            };

            // Function to get date for Startup / All phases
            const getStartupAllDate = (studyMilestones, oraStudyId) => {
                const tryMilestones = ["Protocol Approved", "Protocol Finalization"];

                for (const type of tryMilestones) {
                    const milestone = studyMilestones.find(
                        (m) => m.study === oraStudyId && m.type === type
                    );
                    if (!milestone) continue;

                    const actualStart = cleanDate(milestone.data["Actual Start Date"]);
                    const actualFinish = cleanDate(milestone.data["Actual Finish Date"]);

                    if (actualStart) return actualStart;
                    if (actualFinish) return actualFinish;
                    // If both blank/1900 → continue to next milestone type
                }

                return ""; // nothing found
            };
            // Filter and structure milestones
            const studyMilestones = json
                .map((row) => ({
                    study: row["Ora Project Code"]?.trim(),
                    type: row["Milestone Type"]?.trim(),
                    data: row,
                }))
                .filter((r) => r.study && r.type);
            const phaseDateReference = [
                { phase: "Startup", startLabel: "Protocol Approved", endLabel: "First Subject In" },
                { phase: "Conduct", startLabel: "First Subject In", endLabel: "Last Subject Out" },
                { phase: "LTFU", startLabel: "Last Subject In", endLabel: "Last Subject Out" },
                { phase: "DBL", startLabel: "Last Subject Out", endLabel: "DBL" },
                { phase: "Closeout", startLabel: "DBL", endLabel: "Financially Closed" },
                { phase: "All", startLabel: "Protocol Approved", endLabel: "Financially Closed" },
            ];

            const newDataWithDates = data.map((row) => {
                const oraStudyId = row.oraStudyId?.trim();
                const phase = row.phase?.trim();

                const phaseRef = phaseDateReference.find(
                    (ref) => ref.phase.toLowerCase() === phase?.toLowerCase()
                );

                if (!phaseRef) {
                    return { ...row, plannedStart: "", plannedEnd: "", comments: "Invalid phase" };
                }

                const { startLabel, endLabel } = phaseRef;

                // Determine plannedStart based on phase
                let plannedStart = "";
                if (phase === "Startup" || phase === "All") {
                    plannedStart = getStartupAllDate(studyMilestones, oraStudyId);
                } else {
                    const startMilestone = studyMilestones.find(
                        (m) => m.study === oraStudyId && m.type === startLabel
                    );
                    plannedStart = startMilestone ? getDateByPriority(startMilestone.data) : "";
                }

                // Determine plannedEnd (normal priority for all phases)
                const endMilestone = studyMilestones.find(
                    (m) => m.study === oraStudyId && m.type === endLabel
                );
                const plannedEnd = endMilestone ? getDateByPriority(endMilestone.data) : "";

                const hasError = !plannedStart || !plannedEnd;

                return {
                    ...row,
                    plannedStart,
                    plannedEnd,
                    comments: hasError ? "Missing milestone dates" : "",
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
    const handleExclusionFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            // Collect all Ora Study IDs (trimmed) into an array
            const ids = jsonData
                .map(row => (row["Ora Study ID"] || "").toString().trim())
                .filter(id => id); // Remove blanks
            console.log("Excluded Ora Study IDs:", ids);
            setExcludedOraStudyIds(ids);
        };

        reader.readAsArrayBuffer(file);
    };



    const handleRoleMappingUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            // Convert to mapping object (normalize keys)
            const mapping = {};
            jsonData.forEach(row => {
                const original = (row["Role"] || "").trim().toLowerCase(); // normalize key
                const correct = (row["Correct Role"] || "").trim();
                if (original && correct) {
                    mapping[original] = correct;
                }
            });

            console.log("✅ Role Mapping Loaded:", mapping);
            setRoleMapping(mapping);
        };

        reader.readAsArrayBuffer(file);
    };


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

            const regionMap = {
                NA: [
                    "Canada",
                    "United States",
                    "US non-OraNet",
                    "US OraNet",
                    "Andover Eye"
                ],
                MENA: [
                    "Algeria",
                    "Bahrain",
                    "Egypt",
                    "Iran",
                    "Iraq",
                    "Israel",
                    "Jordan",
                    "Kuwait",
                    "Lebanon",
                    "Libya",
                    "Morocco",
                    "Oman",
                    "Palestine",
                    "Qatar",
                    "Saudi Arabia",
                    "Syria",
                    "Tunisia",
                    "United Arab Emirates",
                    "Yemen"
                ],
                APAC: [
                    "Afghanistan",
                    "Australia",
                    "Bangladesh",
                    "Bhutan",
                    "Brunei Darussalam",
                    "Cambodia",
                    "China",
                    "Cook Islands",
                    "Democratic People's Republic of Korea",
                    "Fiji",
                    "Hong Kong",
                    "India",
                    "Indonesia",
                    "Japan",
                    "Kiribati",
                    "Lao People's Democratic Republic",
                    "Macao",
                    "Malaysia",
                    "Maldives",
                    "Marshall Islands",
                    "New Zealand",
                    "South Korea",
                    "Taiwan"
                ],
                LATAM: [
                    "Argentina",
                    "Belize",
                    "Bolivia",
                    "Brazil",
                    "Chile",
                    "Colombia",
                    "Costa Rica",
                    "Ecuador",
                    "El Salvador",
                    "Guatemala",
                    "Guyana",
                    "Honduras",
                    "Mexico",
                    "Nicaragua",
                    "Panama",
                    "Paraguay",
                    "Peru",
                    "Suriname",
                    "Uruguay",
                    "Venezuela"
                ],
                EU: [
                    "Austria",
                    "Belgium",
                    "Bulgaria",
                    "Croatia",
                    "Czech Republic",
                    "Denmark",
                    "Estonia",
                    "Finland",
                    "France",
                    "Germany",
                    "Greece",
                    "Hungary",
                    "Ireland",
                    "Italy",
                    "Latvia",
                    "Lithuania",
                    "Luxembourg",
                    "Malta",
                    "Netherlands",
                    "Norway",
                    "Poland",
                    "Portugal",
                    "Republic of Cyprus",
                    "Romania",
                    "Slovakia",
                    "Slovenia",
                    "Spain",
                    "Sweden",
                    "Switzerland",
                    "United Kingdom"
                ],
                CN: ["China*"],
                JP: ["Japan*"]
            };


            const dataWithExpandedCountryAndSite = [];
            console.log("🔄 Before country & site added:", data);

            data.forEach((row, index) => {
                const { region = "", oraStudyId = "" } = row;
                const regionCode = region.trim();
                const regionCountries = regionMap[regionCode];

                if (!regionCountries) {
                    // console.log(`Row ${index} → Skipped: Unknown or missing region code (${regionCode})`);

                    // Still include the row with empty country/site info
                    dataWithExpandedCountryAndSite.push({
                        ...row,
                        country: "",
                        site: "",
                        sites: "",
                    });
                    return;
                }

                const matchingEntries = countryTable.filter(entry =>
                    (entry["Study Number"]?.toString().trim() === oraStudyId?.toString().trim() ||
                        entry["Ora Project Code"]?.toString().trim() === oraStudyId?.toString().trim()) &&
                    entry["Site Status"]?.toLowerCase() === "active" &&
                    regionCountries.includes(entry["Study Country"])
                );

                if (matchingEntries.length === 0) {
                    console.log(`Row ${index} → No matching active country entries for oraStudyId "${oraStudyId}" in region ${regionCode}`);
                    dataWithExpandedCountryAndSite.push({
                        ...row,
                        country: "",
                        site: "",
                        sites: "",
                    });
                    return;
                }

                // Group matching entries by country
                const countrySiteMap = {};
                const countrySitesMap = {};

                matchingEntries.forEach(entry => {
                    const country = entry["Study Country"]?.trim();
                    const siteNumber = entry["Study Site Number"]?.toString().trim();

                    if (country) {
                        countrySiteMap[country] = (countrySiteMap[country] || 0) + 1;

                        if (!countrySitesMap[country]) {
                            countrySitesMap[country] = [];
                        }
                        if (siteNumber) {
                            countrySitesMap[country].push(siteNumber);
                        }
                    }
                });

                const countryList = Object.keys(countrySiteMap);
                const siteCountList = countryList.map(country => countrySiteMap[country]);

                if (countryList.length === 0) {
                    // Should not happen, but fallback safety
                    dataWithExpandedCountryAndSite.push({
                        ...row,
                        country: "",
                        site: "",
                        sites: "",
                    });
                } else {
                    countryList.forEach((country, i) => {
                        dataWithExpandedCountryAndSite.push({
                            ...row,
                            country: country,
                            site: siteCountList[i].toString(),
                            sites: countrySitesMap[country].join(", "),
                        });
                    });
                }
            });

            console.log("🔄 After country & site added:", dataWithExpandedCountryAndSite);

            // Step 2: Calculate revisedDemand
            calculateRevisedDemand(dataWithExpandedCountryAndSite);

        };

        reader.readAsArrayBuffer(file);
    };

    //  Step 2 Helper: Calculate revisedDemand and updateData

    function calculateRevisedDemand(rows) {
        const cleanNumber = val => {
            if (val == null) return 0;
            const str = val.toString().replace(/[^0-9.\-]/g, '').trim();
            const num = parseFloat(str);
            return isNaN(num) ? 0 : num;
        };

        // 🔹 Step 1: Build totalSiteMap grouped by oraStudyId + service
        const totalSiteMap = {}; // key = oraStudyId__service => total site sum
        const totalSiteMapKeys = {}; // To track unique keys
        rows.forEach(row => {
            const studyId = row.oraStudyId?.trim();
            const service = row.service?.trim();
            const site = cleanNumber(row.site);

            if (!studyId || !service) return;

            const key = `${studyId}__${service}`;
            if (!totalSiteMap[key]) {
                totalSiteMap[key] = 0;
            }

            totalSiteMap[key] += site;
            totalSiteMapKeys[key] += site.toString(); // Track unique keys
        });

        //  Step 2: Use group totalSite to calculate SiteHrs per row
        const updatedRows = rows.map(row => {
            const studyId = row.oraStudyId?.trim();
            const service = row.service?.trim();
            const site = cleanNumber(row.site);
            const totalHrs = cleanNumber(row.totalHrs);

            const key = `${studyId}__${service}`;
            const totalSite = totalSiteMap[key] || 0;

            let siteHrs = 0;
            if (totalSite > 0 && site > 0) {
                siteHrs = ((totalHrs / totalSite) * site).toFixed(6);
            } else {
                siteHrs = totalHrs;
            }

            return {
                ...row,

                TotalSite: totalSite,
                SiteHrs: Number(siteHrs),
            };
        });

        console.log("Final Rows with TotalSite & SiteHrs:", updatedRows);
        updateData(updatedRows);
    }



    const handleScheduleLevelMilestoneUpload = async (e) => {
        // Get the uploaded file from input
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Read the file as an ArrayBuffer
            const buffer = await file.arrayBuffer();

            // Parse the buffer into a workbook using SheetJS (XLSX)
            const workbook = XLSX.read(buffer, { type: "buffer" });

            // Get the first sheet name (you can customize if needed)
            const sheetName = workbook.SheetNames[0];

            if (!sheetName) {
                alert("Sheets not found!");
                return;
            }

            // Get the worksheet object using the sheet name
            const worksheet = workbook.Sheets[sheetName];

            // Convert worksheet into JSON (raw array of objects)
            const rawMilestoneData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            console.log("📊 Raw Milestone Data:", rawMilestoneData);
            // Clean up column headers: trim keys
            const milestoneData = rawMilestoneData.map(entry => {
                const cleanedEntry = {};
                Object.keys(entry).forEach(key => {
                    cleanedEntry[key.trim()] = entry[key]; // Trim key names
                });

                return cleanedEntry;
            });

            //  Debug: Log the column names
            console.log("📋 Milestone Columns:", Object.keys(milestoneData[0]));

            // Create a lookup map for milestone data by Study Number
            const milestoneMap = {};
            milestoneData.forEach(entry => {
                const studyNumber = (entry["Alternative Study Number"] || "").toString().trim();
                if (studyNumber) milestoneMap[studyNumber] = entry;
            });

            // Merge the milestone fields into your existing data
            const [filteredOutRows, remainingData] = addMetaData(data, milestoneMap)


            //  Update the main state and excluded list
            updateData(remainingData);              // Rows with complete dates
            setInvalidPhaseRows(filteredOutRows);   // Rows missing plannedStart or plannedEnd
            addCraData(remainingData); // Add to CRA data 
            console.log("Final cleaned milestone data:", remainingData);
        } catch (err) {
            console.error(" Error reading schedule milestone file:", err);
        }
    };

    const addCraData = (data) => {
        const expandedRows = [];

        data.forEach(row => {
            const resource = (row.resource || "").toUpperCase();
            if (!resource.includes("CRA")) return; // Skip non-CRA rows

            const site = parseInt(row.site);
            const totalHrs = parseFloat(row.totalHrs);
            const siteHrs = parseFloat(row.SiteHrs);

            if (!isNaN(site) && site > 0 && !isNaN(totalHrs)) {

                const { country, ...rest } = row;
                for (let i = 0; i < site; i++) {
                    const siteList = (row.sites || "").split(",").map(s => s.trim()); // split by comma and trim
                    expandedRows.push({
                        ...row,
                        CountryHrs: siteHrs,
                        CRAcountry: country,
                        SiteHrs: site ? (siteHrs / site).toFixed(6) : siteHrs,
                        CRASites: siteList[i] || "" // assign one site per row
                    });
                }

            } else {
                // No valid site or totalHrs — just add row with craSiteHrs = 0
                expandedRows.push({
                    ...row,
                    CountryHrs: 0,
                    SiteHrs: 0,
                    // craSiteHrs: 0
                });
            }

        });

        console.log("🔄 Expanded CRA Data:", expandedRows);
        setCraData(expandedRows);
    };


    const addMetaData = (data, milestoneMap) => {
        const withMeta = data.map(row => {
            const studyId = (row.oraStudyId || "").toString().trim();
            const match = milestoneMap[studyId];

            return {
                ...row,
                Department: match?.["Department"] || "",
                Sponsor: match?.["Sponsor"] || "",
                currentProjectStatus: match?.["**Current Project Phase"] || "",
                Status: match?.["Status"] || "",
                Indication: match?.["Indication Picklist"] || "",
                enrollmentMethod: match?.["**Enrollment Method"] || "",
                studyNumber: match?.["Study Number"] || "",
                therapeuticArea: match?.["Therapeutic Area"] || "",
                noOfSites: match?.["Number of Sites"] || "",
                noOfCountries: match?.["Country"]?.split(',').length || 0,
                nameOfCountries: match?.["Country"] || "",
                Probability: match?.["Probability"] || "",

                ["In Veeva?"]: match ? "Yes" : "No",  // ✅ New field
            };
        });

        const filteredOutRows = [];
        const remainingData = [];

        withMeta.forEach(row => {
            let comment = "";

            //  New condition: if study not in Veeva
            if (row["In Veeva?"] === "No") {
                comment = "Study not found in Veeva";
            } else {
                const { plannedStart, plannedEnd } = row;

                if (!plannedStart && !plannedEnd) {
                    comment = "Planned Start Date and Planned End Date are missing";
                } else if (!plannedStart) {
                    comment = "Planned Start Date is missing";
                } else if (!plannedEnd) {
                    comment = "Planned End Date is missing";
                } else {
                    const startDate = new Date(plannedStart);
                    const endDate = new Date(plannedEnd);
                    if (endDate < startDate) {
                        comment = "Planned End Date is before Planned Start Date";
                    }
                }
            }

            if (comment) {
                filteredOutRows.push({ ...row, comments: comment });
            } else {
                remainingData.push(row);
            }
        });

        return [filteredOutRows, remainingData];
    };


    const handleLTFUDates = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: "buffer" });

            // Assume first sheet contains OraStudyId, Start LTFU, End LTFU
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

            // Helper: parse Excel date into yyyy-mm-dd
            const parseExcelDate = (val) => {
                if (!val) return "";
                if (typeof val === "number") {
                    const parsed = XLSX.SSF.parse_date_code(val);
                    if (parsed) {
                        const dateStr = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
                            .toISOString()
                            .split("T")[0];
                        return dateStr;
                    }
                }
                if (val instanceof Date) {
                    return val.toISOString().split("T")[0];
                }
                const dt = new Date(val);
                if (!isNaN(dt)) {
                    return dt.toISOString().split("T")[0];
                }
                return val.toString().trim();
            };

            // Build LTFU map
            const ltfuMap = {};
            json.forEach(row => {
                const studyId = (row["OraStudyId"] || row["oraStudyId"] || "").toString().trim();
                if (!studyId) return;
                const start = parseExcelDate(row["Start LTFU"]);
                const end = parseExcelDate(row["End LTFU"]);
                ltfuMap[studyId] = { start, end };
            });

            // Collect LTFU errors
            const ltfuErrorRows = [];
            const newData = data.map(row => {
                const studyId = (row.oraStudyId || "").toString().trim();
                if (row.phase?.toLowerCase() === "ltfu") {
                    const ltfu = ltfuMap[studyId];
                    // Study not in LTFU table
                    if (!ltfu) {
                        ltfuErrorRows.push({
                            ...row,
                            comments: "ORA Attention required"
                        });
                        return null;
                    }
                    // Date is 1900 (Excel default for missing date)
                    if (
                        (!ltfu.start || ltfu.start.startsWith("1900")) ||
                        (!ltfu.end || ltfu.end.startsWith("1900"))
                    ) {
                        ltfuErrorRows.push({
                            ...row,
                            plannedStart: ltfu.start,
                            plannedEnd: ltfu.end,
                            comments: "Not an LTFU study as per ORA"
                        });
                        return null;
                    }
                    // Valid LTFU dates
                    return {
                        ...row,
                        plannedStart: ltfu.start || row.plannedStart,
                        plannedEnd: ltfu.end || row.plannedEnd,
                        comments: row.comments
                    };
                }
                return row;
            }).filter(Boolean);

            updateData(newData);

            // Merge previous errors with new LTFU errors
            setInvalidPhaseRows(prev => [...prev, ...ltfuErrorRows]);

            console.log("✅ Updated rows with LTFU dates applied:", newData);
            console.log("❌ Error rows:", ltfuErrorRows);

        } catch (err) {
            console.error("❌ Error reading LTFU file:", err);
        }
    };


    const handleOverlapData = () => {
        if (!data || data.length === 0) {
            alert("No data available for overlap check");
            return;
        }

        // Group by Study ID
        const grouped = data.reduce((acc, row) => {
            const id = row.oraStudyId;
            if (!acc[id]) acc[id] = [];
            acc[id].push(row);
            return acc;
        }, {});

        const updatedRows = [];

        Object.values(grouped).forEach(rows => {
            // Sort by custom phase order
            rows.sort((a, b) => {
                return PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase);
            });

            let prevEnd = null;

            rows.forEach((row, idx) => {
                const start = row.plannedStart ? new Date(row.plannedStart) : null;
                const end = row.plannedEnd ? new Date(row.plannedEnd) : null;

                let overlap = ""; // leave blank unless it’s a phase transition row

                // Mark only first row of each phase
                if (
                    idx === 0 || // first phase always gets a marker
                    row.phase !== rows[idx - 1].phase // new phase transition
                ) {
                    if (prevEnd && start) {
                        overlap = prevEnd <= start ? "False" : "True";
                    } else {
                        overlap = "False"; // no previous to compare
                    }
                }

                updatedRows.push({
                    ...row,
                    Overlap: overlap,
                });

                if (end) prevEnd = end;
            });
        });


        updateData(updatedRows);


        const overlapFalseRows = updatedRows.filter(row => row.Overlap === "True");

        if (overlapFalseRows.length === 0) {
            alert("No overlap issues found");
        } else {
            const worksheet = XLSX.utils.json_to_sheet(overlapFalseRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Overlap Issues");
            XLSX.writeFile(workbook, "overlap_check_false.xlsx");
            console.log("✅ Overlap issues file exported with only 'False' rows");
        }


        console.log("✅ Overlap file exported in simplified format");
    };

    const handleTimeSheet = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        console.log("📥 Timesheet file uploaded:", file.name);

        const referenceData = data;

        if (!referenceData || referenceData.length === 0) {
            console.warn("⚠️ Reference data is empty. Phases will be empty.");
        }

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: "buffer" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];

            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
            if (!rawData || rawData.length === 0) {
                alert("No data found in timesheet file.");
                return;
            }

            const headers = rawData[0].map(h => h.toString().trim());
            const timesheetData = rawData.slice(1).map(row => {
                const obj = {};
                headers.forEach((h, i) => obj[h] = row[i]);
                return obj;
            });

            const parseDate = (dateValue) => {
                if (!dateValue) return null;
                if (typeof dateValue === "number") {
                    const parsed = XLSX.SSF.parse_date_code(dateValue);
                    return parsed ? new Date(parsed.y, parsed.m - 1, parsed.d) : null;
                }
                return new Date(dateValue);
            };

            const updatedTimesheet = timesheetData.map(row => {
                const projectNumber = (row["Project Number"] || "").toString().trim();
                const dateStr = row["Date"];
                const tsDate = parseDate(dateStr);

                let phase = "";

                if (projectNumber && tsDate) {
                    // Match only by Project Number and exclude empty or "All" phases
                    const matchedRows = referenceData.filter(d =>
                        d.oraStudyId?.toString().trim().toLowerCase() === projectNumber.toLowerCase() &&
                        d.phase && d.phase.trim() !== "" && d.phase.trim().toLowerCase() !== "all"
                    );

                    // Stop at the first valid match
                    for (let match of matchedRows) {
                        const plannedStart = parseDate(match.plannedStart);
                        const plannedEnd = parseDate(match.plannedEnd);

                        if (plannedStart && plannedEnd) {
                            // Compare month and year only
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
                                break; // Use the first valid match and stop
                            }
                        }
                    }
                }

                return {
                    ...row,
                    Phase: phase
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(updatedTimesheet);
            const newWorkbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(newWorkbook, worksheet, "Updated Timesheet");
            XLSX.writeFile(newWorkbook, "updated_timesheet_with_phase.xlsx");

            alert(`Timesheet processed! Downloaded ${updatedTimesheet.length} rows with Phase column.`);
        } catch (err) {
            console.error(" Error processing timesheet file:", err);
            alert("Error processing timesheet file. Check console for details.");
        }
    };

    const triggerActiveFiles = async () => {
        try {
            await fetch("http://localhost:3003/api/fetch-files", {
                method: "GET" // or GET — use what your API uses
            });
            alert("Active files download started on server");
        } catch (e) {
            console.error(e);
            alert("Error triggering Active files API");
        }
    };

    const triggerPipelineFiles = async () => {
        try {
            await fetch("http://localhost:3003/api/fetch-pipeline-files", {
                method: "GET" // or GET — use what your API uses
            });
            alert("Pipeline files download started on server");
        } catch (e) {
            console.error(e);
            alert("Error triggering Pipeline files API");
        }
    };

    const applyConductEndFromLTFUStart = () => {
        if (!data || data.length === 0) {
            alert("No data available");
            return;
        }

        const grouped = {};

        // Group rows by Study
        data.forEach(row => {
            const id = row.oraStudyId;
            if (!grouped[id]) grouped[id] = [];
            grouped[id].push(row);
        });

        const updatedRows = [];

        Object.values(grouped).forEach(rows => {
            const ltfuRow = rows.find(r => r.phase?.toLowerCase() === "ltfu");

            rows.forEach(row => {
                if (row.phase?.toLowerCase() === "conduct" && ltfuRow?.plannedStart) {
                    updatedRows.push({
                        ...row,
                        plannedEnd: ltfuRow.plannedStart,
                        comments: (row.comments || "") + " | Conduct end derived from LTFU start"
                    });
                } else {
                    updatedRows.push(row);
                }
            });
        });

        // ✅ NEW VALIDATION BLOCK (same as addMetaData)
        const errorRows = [];
        const validRows = [];

        updatedRows.forEach(row => {
            let comment = row.comments || "";

            const start = row.plannedStart ? new Date(row.plannedStart) : null;
            const end = row.plannedEnd ? new Date(row.plannedEnd) : null;

            if (start && end && end < start) {
                comment = "Planned End Date is before Planned Start Date";
                errorRows.push({ ...row, comments: comment });
            } else {
                validRows.push(row);
            }
        });

        // ✅ Update main data
        updateData(validRows);

        // ✅ Send to error file list
        setInvalidPhaseRows(prev => [...prev, ...errorRows]);

        alert("✅ Conduct plannedEnd updated and date validation applied");
    };

    return (
        <div className="container-fluid p-4 bg-light min-vh-100">

            {/* HEADER ACTION BAR */}
            <div className="card shadow-sm p-3 mb-4">
                <div className="d-flex flex-wrap gap-2">

                    <button className="btn btn-outline-primary" onClick={triggerActiveFiles}>
                        Download Active Files
                    </button>

                    <button className="btn btn-outline-primary" onClick={triggerPipelineFiles}>
                        Download Pipeline Files
                    </button>

                    <button className="btn btn-success" onClick={() => navigate("/employee-automation")}>
                        Employee Automation
                    </button>

                    <button className="btn btn-success" onClick={() => navigate("/timesheet-automation")}>
                        Timesheet Automation
                    </button>

                    <button className="btn btn-primary" onClick={handleOverlapData}>
                        Overlap File
                    </button>

                </div>
            </div>

            {/* FILE UPLOAD SECTION */}
            <div className="row g-3">

                {/* Bulk Upload */}
                <div className="col-md-6">
                    <div className="card shadow-sm p-3">
                        <h5 className="mb-3">Import Active Excel Files</h5>
                        <input className="form-control" type="file" multiple accept=".xlsx,.xls" onChange={handleFileUpload} />
                    </div>
                </div>

                {/* Study File */}
                <div className="col-md-6">
                    <div className="card shadow-sm p-3">
                        <label className="fw-bold">Upload Active Study File</label>
                        <input className="form-control" type="file" accept=".xlsx,.xls,.csv" onChange={handleStudyUpload} />
                    </div>
                </div>

                {/* Exclusion */}
                <div className="col-md-6">
                    <div className="card shadow-sm p-3">
                        <label className="fw-bold">Upload Exclude StudyID File</label>
                        <input className="form-control" type="file" accept=".xlsx,.xls,.csv" onChange={handleExclusionFileUpload} />
                    </div>
                </div>

                {/* Role Mapping */}
                <div className="col-md-6">
                    <div className="card shadow-sm p-3">
                        <label className="fw-bold">Upload Role Mapping</label>
                        <input className="form-control" type="file" accept=".xlsx,.xls,.csv" onChange={handleRoleMappingUpload} />
                    </div>
                </div>

                {/* Milestone */}
                <div className="col-md-6">
                    <div className="card shadow-sm p-3">
                        <label className="fw-bold">Upload Milestone File</label>
                        <input className="form-control" type="file" accept=".xlsx,.xls,.csv" onChange={handleMilestoneUpload} />
                    </div>
                </div>

                {/* Study Country */}
                <div className="col-md-6">
                    <div className="card shadow-sm p-3">
                        <label className="fw-bold">Upload Study Country & Site</label>
                        <input className="form-control" type="file" accept=".csv,.xlsx,.xls" onChange={handleStudyCountry} />
                    </div>
                </div>

                {/* Schedule Milestone */}
                <div className="col-md-6">
                    <div className="card shadow-sm p-3">
                        <label className="fw-bold">Schedule Level Milestone Meta</label>
                        <input className="form-control" type="file" accept=".xlsx,.xls,.csv" onChange={handleScheduleLevelMilestoneUpload} />
                    </div>
                </div>

                {/* LTFU */}
                <div className="col-md-6">
                    <div className="card shadow-sm p-3">
                        <label className="fw-bold">LTFU Dates File</label>
                        <input className="form-control" type="file" accept=".xlsx,.xls,.csv" onChange={handleLTFUDates} />
                    </div>
                </div>

                {/* Timesheet */}
                <div className="col-md-6">
                    <div className="card shadow-sm p-3">
                        <label className="fw-bold">Upload Timesheet File</label>
                        <input className="form-control" type="file" accept=".xlsx,.xls,.csv" onChange={handleTimeSheet} />
                    </div>
                </div>
                <button className="btn btn-warning" onClick={applyConductEndFromLTFUStart}>
                    Fix Conduct End Date
                </button>

            </div>

            {/* LOADING */}
            {loading && (
                <div className="text-center mt-4">
                    <Spinner animation="border" />
                </div>
            )}

            {/* DATA */}
            <div className="mt-4">
                <Categories
                    craData={cradata}
                    errorFile={invalidPhaseRows}
                    currentData={data}
                    loading={loading}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                />

                {!loading && data.length === 0 && (
                    <p className="text-muted mt-3">No data loaded yet.</p>
                )}
            </div>

        </div>
    );
}

export default App;