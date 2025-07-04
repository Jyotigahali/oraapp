// App.js
import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import RollupTable from './RollupTable ';
import { Table, Button, Pagination } from "react-bootstrap";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function Categories(props) {
  const [activeTab, setActiveTab] = useState('tab1');
  const [ScenerioOne, setScenerioOne] = useState([]);
  const [ScenerioTwo, setScenerioTwo] = useState([]);
  const [ScenerioThree, setScenerioThree] = useState([]) 
  const { currentData, loading,setCurrentPage,currentPage,errorFile, craData } = props;
  // console.log("currentData", currentData);
  useEffect(() => {
    // localStorage.setItem("currentData1", JSON.stringify(currentData));
    if(activeTab === 'region' && currentData.length > 0) {
      const rolledUpByRegion = Object.values(
        currentData.reduce((acc, curr) => {
          const { resource, oraStudyId, protocol, phase, totalHrs, SiteHrs,hrsPerUnit,country, units,plannedStart,plannedEnd, ...rest } = curr;      
          // Key to group by: combination of resource + oraStudyId + protocol
          const key = `${resource}|${oraStudyId}|${phase}`;
          const region = resource.split("-")[0]
          const totalHours = parseFloat(totalHrs) || 0;
          if (!acc[key]) {
            acc[key] = {
              ...rest, // All other fields (Department, Sponsor, etc.)
              resource,
              WorkItem: protocol ? `${oraStudyId} - ${protocol}` : oraStudyId,
              activity: phase,
              role: resource,
              start : plannedStart,
              end : plannedEnd,
              resourceRegion:  country ? `${region}-${country}` : resource,
              SiteHrs: 0,
              totalHrs: 0,
              units: 0,
              hrsPerUnit: 0,
              oraStudyId,
              protocol,
              country,
          }
        }
          acc[key].SiteHrs += SiteHrs;
          acc[key].totalHrs += totalHours;
          acc[key].units += units;
          acc[key].hrsPerUnit += hrsPerUnit;
      
          return acc;
        }, {})
      );
      
      // Convert the object back to an array
      let newArray = Object.values(rolledUpByRegion);
      console.log("rolledUp_region", newArray);  
      setScenerioOne(newArray);
    }

    if(activeTab === 'country' && currentData.length > 0) {
      const rolledUpByCountry = Object.values(
        currentData.reduce((acc, curr) => {
          const { resource, oraStudyId, protocol, phase,totalHrs, SiteHrs,hrsPerUnit,country, units,plannedStart,plannedEnd, ...rest } = curr;
      
          // Key to group by: combination of resource + oraStudyId + protocol
          const key = `${country}|${oraStudyId}|${phase}|${resource}`;
          const region = resource.split("-")[0]
          const totalHours = parseFloat(totalHrs) || 0;
          const SiteHours = parseFloat(SiteHrs) || 0;
          if (!acc[key]) {
            acc[key] = {
              ...rest, // All other fields (Department, Sponsor, etc.)
              resource,
              WorkItem:protocol ? `${oraStudyId} - ${protocol}` : oraStudyId,
              activity: phase,
              role: country ? `${region}-${country}` : resource,
              resourceRegion: country ? `${region}-${country}` : resource,
              start : plannedStart,
              end : plannedEnd,
              SiteHrs: 0,
              totalHrs: 0,
              units: 0,
              hrsPerUnit: 0,
              region: resource.split("-")[1],
              oraStudyId,
              protocol,
              country
          }
        }
          acc[key].SiteHrs += SiteHours;
          acc[key].totalHrs += totalHours;
          acc[key].units += units;
          acc[key].hrsPerUnit += hrsPerUnit;
      
          return acc;
        }, {})
      );

      let newArray = Object.values(rolledUpByCountry);
      console.log("rolledUp_country", newArray);
      setScenerioTwo(newArray);
    }

    if(activeTab === 'CRA/LCRA' && craData.length > 0) {
      console.log("craData", craData);
      const rolledUpByCRA = Object.values(
        craData.reduce((acc, curr) => {
          const { resource, oraStudyId, protocol, phase,SiteHrs, totalHrs,hrsPerUnit,CraCountry, units,plannedStart,plannedEnd,CraSite, ...rest } = curr;
          const key = `${CraSite}|${oraStudyId}|${phase}|${resource}`;
          const region = resource.split("-")[0];
          const siteHrs = parseFloat(SiteHrs) || 0;
          const totalHrsValue = parseFloat(totalHrs) || 0;
          if (!acc[key]) {
            acc[key] = {
              ...rest, // All other fields (Department, Sponsor, etc.)
              resource,
              WorkItem: oraStudyId,
              activity: phase,
              role: resource,
              resourceRegion: CraCountry ? `${region}-${CraCountry}` : resource,
              start : plannedStart,
              end : plannedEnd,
              totalHrs: 0,
              SiteHrs: 0,
              units: 0,
              hrsPerUnit: 0,
              region: resource.split("-")[1],
              country: CraCountry,
              site: CraSite,
              oraStudyId,
              protocol,
          }
        }
          acc[key].totalHrs += totalHrsValue;
          acc[key].SiteHrs += siteHrs;
          acc[key].units += units;
          acc[key].hrsPerUnit += hrsPerUnit;
      
          return acc;
        }, {})
      );
      let newArray = Object.values(rolledUpByCRA);
      console.log("rolledUp_CRA/LCRA", newArray);  
      setScenerioThree(newArray);
    }
  }, [activeTab, currentData, craData]);

  const exportToCSV = (data, fileName) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Export");
    const wbout = XLSX.write(wb, { bookType: "csv", type: "array" });
    saveAs(new Blob([wbout], { type: "text/csv;charset=utf-8;" }), fileName);
  };
  const rowsPerPage = 100;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = currentData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(currentData.length / rowsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  
  return (
    <div className="mt-4">
      <ul className="nav nav-tabs">
      <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'tab1' ? 'active' : ''}`}
            onClick={() => setActiveTab('tab1')}
          >
            Total Data
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'region' ? 'active' : ''}`}
            onClick={() => setActiveTab('region')}
          >
            Scenerio One
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'country' ? 'active' : ''}`}
            onClick={() => setActiveTab('country')}
          >
             Scenerio Two
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'CRA/LCRA' ? 'active' : ''}`}
            onClick={() => setActiveTab('CRA/LCRA')}
          >
             Scenerio Three
          </button>
        </li>
      </ul>

      <div className="tab-content mt-3">
        {activeTab === 'tab1' && 
        <div className="tab-pane active">
         {currentData.length > 0 && !loading && (
        <>
          <Button className="my-3" onClick={() => exportToCSV(currentData, "export.csv")}>
            Export as CSV
          </Button>

             <Button className="my-3" onClick={() => exportToCSV(errorFile, "exporteErrorFile.csv")}>
            Export  error CSV
          </Button>

             <Button className="my-3" onClick={() => exportToCSV(craData, "exporteCRA/LCRAFile.csv")}>
               Export  CRA File
          </Button>

          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Sl. No</th>
                <th>Protocol</th>
                <th>Ora_Study_ID</th>
                <th>Service</th>
                <th># Units</th>
                <th>Hrs per Unit</th>
                <th>Total Hrs</th>
                <th>Resource</th>
                <th>Role</th>
                <th>Region</th>
                {/* <th>Work Item</th> */}
                <th>Phase</th>
                <th>Planned Start Date</th>
                <th>Planned Finish Date</th>
                <th>Country</th>
                <th>Site</th>
                <th>TotalSite</th>
                <th>SiteHrs</th>
                <th>Revised Demand</th>
                {/* <th>Country Demand</th> */}
                <th>Department</th>
                <th>Sponsor</th>
                <th>Current Project Status</th>
                <th>Indication</th>
                <th>Enrollment Method</th>
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
                  <td>{row.role}</td>
                  <td>{row.region}</td>
                  <td>{row.phase}</td>
                  <td>{row.plannedStart || ""}</td>
                  <td>{row.plannedEnd || ""}</td>
                  <td>{row.country || ""}</td>
                  <td>{row.site || ""}</td>
                  <td>{row.TotalSite}</td>
                  <td>{row.SiteHrs}</td>
                  <td>{row.revisedDemand || ""}</td>
                  {/* <td>{row.countryDemand}</td> */}
                  <td>{row.Department || ""}</td>
                  <td>{row.Sponsor || ""}</td>
                  <td>{row.currentProjectStatus || ""}</td>
                  <td>{row.Indication || ""}</td>
                  <td>{row.enrollmentMethod || ""}</td>
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
        </div>}
        {activeTab === 'region' && ScenerioOne.length > 0 && <div className="tab-pane active"> <RollupTable data={ScenerioOne} exportToCSV={exportToCSV} activeTab={activeTab} /></div>}
        {activeTab === 'country' && ScenerioTwo.length > 0 && <div className="tab-pane active"><RollupTable data={ScenerioTwo} exportToCSV={exportToCSV} activeTab={activeTab} /></div>}
        {activeTab === 'CRA/LCRA' && ScenerioThree.length > 0 && <div className="tab-pane active"><RollupTable data={ScenerioThree} exportToCSV={exportToCSV} activeTab={activeTab} /></div>}
      </div>
    </div>
  );
}

export default Categories;
