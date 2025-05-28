import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
// import fs from 'fs';

// Read and split file content into arrays
// const firstSet = new Set(fs.readFileSync('firstSet.txt', 'utf-8').split('\n').map(line => line.trim()));
// const secondSet = fs.readFileSync('secondSet.txt', 'utf-8').split('\n').map(line => line.trim());


export const uniqueFiles = (firstSett, secondSett) => {
  const newList = [];
  console.log("Length of first set:", firstSett);
  const firstSet = firstSett.map(item => item["Ora Project Code"]) //Alternative Study Number - for meta file
  const secondSet = secondSett.map(item => item["Ora Study ID"]);
  console.log("Length of second set:", secondSet.length);
  const firstSetSet = new Set(firstSet);
  const secondSetSet = new Set(secondSet);
  for (const id of secondSetSet) {
    if (!firstSetSet.has(id)) {
      newList.push(id);
      firstSetSet.add(id); // Avoid duplicates
    }
    
  }
  // Create a new array to store unique IDs
  // Iterate through the second set and add unique IDs to the new array
const worksheet = XLSX.utils.aoa_to_sheet([["Unique IDs"], ...newList.map(id => [id])]);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "UniqueFiles");
const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), "uniqueIds_mile.xlsx");
  return newList;
}

 
