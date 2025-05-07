const express = require("express");
const axios = require("axios");
const ExcelJS = require("exceljs");
const cors = require("cors");
require("dotenv").config();
const getAccessToken = require("./auth");

const app = express();
const PORT = 3001;

app.use(cors());

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

async function getValidFilesRecursively(siteId, driveId, folderId, token, matchingFiles, fileLimit = 10) {
  const res = await axios.get(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${folderId}/children`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  for (const item of res.data.value) {
    // Check if we have reached the limit of files
    if (matchingFiles.length >= fileLimit) {
      break;
    }

    if (item.folder) {
      console.log(`Entering folder: ${item.name}`);
      await getValidFilesRecursively(siteId, driveId, item.id, token, matchingFiles, fileLimit);
    } else {
      try {
        const fieldRes = await axios.get(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${item.id}/listItem/fields`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const fields = fieldRes.data;
        if (fields.Current_Version === true && fields.Ora_Study_ID) {
          matchingFiles.push({
            name: item.name,
            id: item.id,
            webUrl: item.webUrl,
            currentVersion: fields.Current_Version,
            oraStudyId: fields.Ora_Study_ID
          });
        }
      } catch (err) {
        console.warn(`Skipping file (no fields found): ${item.name}`);
      }
    }
  }
}


app.get("/api/fetch-files", async (req, res) => {
  try {
    const token = await getAccessToken();

    const siteResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/sites?search=Project Financial Data Hub`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const siteId = siteResponse.data.value[0]?.id;

    const driveRes = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const driveId = driveRes.data.value.find((d) => d.name === "Documents")?.id;

    const rootChildren = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root/children`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const activeProjects = rootChildren.data.value.find(item => item.name === "1. Active Projects");
    if (!activeProjects) throw new Error('"1. Active Projects" folder not found');

    const activeChildren = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${activeProjects.id}/children`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const anteriorFolder = activeChildren.data.value.find(item => item.name === "01. Anterior");
    if (!anteriorFolder) throw new Error('"Anterior" folder not found under "1. Active Projects"');

    const matchingFiles = [];
    await getValidFilesRecursively(siteId, driveId, anteriorFolder.id, token, matchingFiles);

    res.json(matchingFiles);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Error fetching SharePoint files");
//     UserName:  jghali@oraclinical.com
// PW: Numerical.Tantrum43!
  }
});

// routes/api.js or similar
app.get("/api/fetch-sheets/:fileId", async (req, res) => {
  const fileId = req.params.fileId;

  try {
    const token = await getAccessToken();

    // Step 1: Get siteId
    const siteResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/sites?search=Project Financial Data Hub`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const siteId = siteResponse.data.value[0]?.id;

    // Step 2: Get driveId
    const driveRes = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const driveId = driveRes.data.value.find((d) => d.name === "Documents")?.id;

    // Step 3: Get download URL
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
