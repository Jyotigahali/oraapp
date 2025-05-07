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
async function getValidFilesRecursively(siteId, driveId, folderId, token, matchingFiles) {
  const res = await axios.get(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${folderId}/children`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  for (const item of res.data.value) {
    if (item.folder) {
      console.log(`Entering folder: ${item.name}`);
      await getValidFilesRecursively(siteId, driveId, item.id, token, matchingFiles);
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
  }
});









// routes/api.js or similar
app.get("/api/fetch-sheets/:fileId", async (req, res) => {
  const fileId = req.params.fileId;

  try {
    const client = getAccessToken();
    const downloadUrl = await client
      .api(`/me/drive/items/${fileId}`)
      .select("@microsoft.graph.downloadUrl")
      .get();

    const url = downloadUrl["@microsoft.graph.downloadUrl"];
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    const workbook = XLSX.read(arrayBuffer, { type: "buffer" });

    // Normalize sheet names
    const sheetMap = {};
    workbook.SheetNames.forEach((sheetName) => {
      sheetMap[sheetName.trim().toLowerCase()] = sheetName;
    });

    const clientBudgetSheetName = sheetMap["Study Budget"] || sheetMap["Internal Budget"];
    const studySpecsSheetName = sheetMap["Study Specs"];

    if (!clientBudgetSheetName) {
      return res.status(404).json({ error: "Neither 'Study Budget' nor 'Internal Budget' sheet found." });
    }

    if (!studySpecsSheetName) {
      return res.status(404).json({ error: "'Study Specs' sheet not found." });
    }

    const clientBudgetData = XLSX.utils.sheet_to_json(workbook.Sheets[clientBudgetSheetName], { header: 1 });
    const studySpecsData = XLSX.utils.sheet_to_json(workbook.Sheets[studySpecsSheetName], { header: 1 });

    res.json({
      clientBudget: clientBudgetData,
      studySpecs: studySpecsData,
    });
  } catch (error) {
    console.error("Error fetching Excel sheets:", error.message);
    res.status(500).json({ error: "Failed to fetch or parse Excel sheets." });
  }
});


// ------------------- LISTEN ONCE -------------------
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
