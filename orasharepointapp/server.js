const express = require("express");
const axios = require("axios");
const ExcelJS = require("exceljs");
const cors = require("cors");
require("dotenv").config();
const getAccessToken = require("./auth");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const PORT = 3001;

app.use(cors());

const siteId = process.env.SITE_ID;
const driveId = process.env.DRIVE_ID;
const activeProjectsId = process.env.ACTIVEPROJECTS_ID
const anteriorFolderId = process.env.ANTERIORFOLDER_ID
const biometricsOnlyFolderId = process.env.BIOMETRICS_ONLY_FOLDER_ID
const medicalDevicesFolderId = process.env.MEDICAL_DEVICE_FOLDER_ID
const posteriorFolderId = process.env.POSTERIOR_FOLDER_ID
const folderIds = [
  {id:anteriorFolderId, name: "01. Anterior"},
  {id:biometricsOnlyFolderId, name: "02. Biometrics Only"},
  {id:medicalDevicesFolderId, name: "03. Medical Devices"}, 
  {id:posteriorFolderId, name: "04. Posterior"}
];
// ------------------- NEW ENDPOINT -------------------
// async function getValidFilesRecursively(siteId, driveId, folderId, token, matchingFiles) {
//   const res = await axios.get(
//     `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${folderId}/children`,
//     { headers: { Authorization: `Bearer ${token}` } }
//   );

//   for (const item of res.data.value) {
//     if (item.folder) {
//       console.log(`Entering folder: ${item.name}`);
//       await getValidFilesRecursively(siteId, driveId, item.id, token, matchingFiles);
//     } else {
//       try {
//         const fieldRes = await axios.get(
//           `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${item.id}/listItem/fields`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );

//         const fields = fieldRes.data;
//         if (fields.Current_Version === true && fields.Ora_Study_ID) {
//           matchingFiles.push({
//             name: item.name,
//             id: item.id,
//             webUrl: item.webUrl,
//             currentVersion: fields.Current_Version,
//             oraStudyId: fields.Ora_Study_ID
//           });
//         }
//       } catch (err) {
//         console.warn(`Skipping file (no fields found): ${item.name}`);
//       }
//     }
//   }
// }

let matchedFilesCount = 0
async function getValidFilesRecursively(siteId, driveId, folderId, token, matchingFiles, folderName) {
  const res = await axios.get(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${folderId}/children`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  // console.log("response", res.data.value)
  for (const item of res.data.value) {
    if (item.folder) {
      console.log(`Entering folder: ${item.name}`);
      getValidFilesRecursively(siteId, driveId, item.id, token, matchingFiles, folderName);
    } else {
      try {
        const fieldRes = await axios.get(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${item.id}/listItem/fields`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const fields = fieldRes.data;
        if (fields.Current_Version === true && fields.Ora_Study_ID) {
          matchedFilesCount++;
          matchingFiles.push({
            name: item.name,
            oraStudyId: fields.Ora_Study_ID,
            id: item.id,
            webUrl: item.webUrl,
            currentVersion: fields.Current_Version,
            folderName: folderName,
          });
        // DOWNLOAD the file
        const fileResponse = await axios.get(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${item.id}/content`,
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'arraybuffer',
          }
        );
        const downloadPath = path.join(os.homedir(), "Downloads", item.name);
        fs.writeFileSync(downloadPath, fileResponse.data);
        console.log(` ${matchingFiles.length} Saved to system Downloads folder: ${downloadPath}`);        
        }
      } catch (err) {
        console.warn(`Skipping file (no fields found): ${item.name}`);
      }
    }
  }
  if(matchingFiles.length === matchedFilesCount){
    exportMatchingFilesToExcel(matchingFiles);
  }
  console.log("maching files length " , matchingFiles.length, matchedFilesCount)
}

app.get("/api/fetch-files", async (req, res) => {
  try {
    const token = await getAccessToken();

    // const siteResponse = await axios.get(
    //   `https://graph.microsoft.com/v1.0/sites?search=Project Financial Data Hub`,
    //   { headers: { Authorization: `Bearer ${token}` } }
    // );
    // const siteId = siteResponse.data.value[0]?.id;
    
    // const driveRes = await axios.get(
    //   `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
    //   { headers: { Authorization: `Bearer ${token}` } }
    // );
    // const driveId = driveRes.data.value.find((d) => d.name === "Documents")?.id;

    // const rootChildren = await axios.get(
    //   `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root/children`,
    //   { headers: { Authorization: `Bearer ${token}` } }
    // );
    // const activeProjects = rootChildren.data.value.find(item => item.name === "1. Active Projects");
    // if (!activeProjects) throw new Error('"1. Active Projects" folder not found');
    
    // const activeChildren = await axios.get(
    //   `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${activeProjectsId}/children`,
    //   { headers: { Authorization: `Bearer ${token}` } }
    // );
    // const anteriorFolder = activeChildren.data.value.find(item => item.name === "01. Anterior");
    // if (!anteriorFolder) throw new Error('"Anterior" folder not found under "1. Active Projects"');
    // console.log("siteId",siteId,"driveId", driveId,"activeProjects.id",activeProjects.id, "anteriorFolder.id", anteriorFolder.id)
    const matchingFiles = [];
    folderIds.forEach(async folder => {
      console.log("folderId", folder.id, "folderName", folder.name)
      await getValidFilesRecursively(siteId, driveId, folder.id, token, matchingFiles,folder.name);
      // await getValidFilesRecursively(siteId, driveId, folderId, token, matchingFiles);
    }
    )
    // await getValidFilesRecursively(siteId, driveId, anteriorFolderId, token, matchingFiles);
    // await exportMatchingFilesToExcel(matchingFiles);
    res.json(matchingFiles);
    console.log("Successfully downloaded active files and matched files")
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Error fetching SharePoint files");
//     UserName:  jghali@oraclinical.com
// PW: Numerical.Tantrum43!
  }
});

async function exportMatchingFilesToExcel(matchingFiles) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Matching Files");

  // Add headers
  worksheet.columns = [
    { header: "File Name", key: "name" },
    { header: "Ora Study ID", key: "oraStudyId", width: 30 },
    { header: "Folder Name", key: "folderName", width: 30 },
    // { header: "File ID", key: "id" },
    // { header: "Web URL", key: "webUrl", width: 50 },
    // { header: "Current Version", key: "currentVersion", width: 20 },
  ];

  // Add rows
  matchingFiles.forEach(file => worksheet.addRow(file));

  // Save to system Downloads folder
  const downloadPath = path.join(os.homedir(), "Downloads", "ActiveFilesWithOraStudyID.xlsx");
  await workbook.xlsx.writeFile(downloadPath);

  console.log(`📥 Excel exported to: ${downloadPath}`);
}
// routes/api.js or similar
app.get("/api/fetch-sheets/:fileId", async (req, res) => {
  const fileId = req.params.fileId;

  try {
    const token = await getAccessToken();

    // Step 1: Get siteId
    // const siteResponse = await axios.get(
    //   `https://graph.microsoft.com/v1.0/sites?search=Project Financial Data Hub`,
    //   { headers: { Authorization: `Bearer ${token}` } }
    // );
    // const siteId = siteResponse.data.value[0]?.id;

    // // Step 2: Get driveId
    // const driveRes = await axios.get(
    //   `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
    //   { headers: { Authorization: `Bearer ${token}` } }
    // );
    // const driveId = driveRes.data.value.find((d) => d.name === "Documents")?.id;

    // // Step 3: Get download URL
    const downloadUrlRes = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${fileId}?select=@microsoft.graph.downloadUrl`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const url = downloadUrlRes.data['@microsoft.graph.downloadUrl'];

    // Step 4: Load Excel file using ExcelJS
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.data);

    let clientBudgetSheetActualName = null;
    let studySpecsSheetActualName = null;

    // Step 5: Scan all sheet names
    workbook.worksheets.forEach((ws) => {
      const normalized = ws.name.trim().toLowerCase();
      console.log("Found sheet:", ws.name, "Normalized:", normalized);

      if (normalized === "study budget" && !clientBudgetSheetActualName) {
        clientBudgetSheetActualName = ws.name;
      } else if (normalized === "internal budget" && !clientBudgetSheetActualName) {
        clientBudgetSheetActualName = ws.name;
      }

      if (normalized === "study specs") {
        studySpecsSheetActualName = ws.name;
      }
    });

    // Step 6: Check if required sheets are found
    if (!clientBudgetSheetActualName) {
      return res.status(404).json({
        error: "Sheet 'Study Budget' or 'Internal Budget' not found.",
      });
    }

    if (!studySpecsSheetActualName) {
      return res.status(404).json({
        error: "Sheet 'Study Specs' not found.",
      });
    }

    console.log("Selected client budget sheet:", clientBudgetSheetActualName);
    console.log("Selected study specs sheet:", studySpecsSheetActualName);

    // Step 7: Get actual worksheet objects
    const clientBudgetSheet = workbook.getWorksheet(clientBudgetSheetActualName);
    const studySpecsSheet = workbook.getWorksheet(studySpecsSheetActualName);

    
    const parseSheet = (sheet) => {
      if (!sheet) return [];
      const values = sheet.getSheetValues();
      return values
        .slice(1)
        .filter((row) => row)
        .map((row) => Object.values(row));
    };

    // Step 9: Send parsed data
    res.json({
      clientBudget: parseSheet(clientBudgetSheet),
      studySpecs: parseSheet(studySpecsSheet),
    });

  } catch (error) {
    console.error("Error fetching Excel sheets:", error.response?.data || error.message);
    res.status(500).json({
      error: "Arrey yaar! Something went wrong while reading Excel sheets.",
    });
  }
});


// ------------------- LISTEN ONCE -------------------
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
