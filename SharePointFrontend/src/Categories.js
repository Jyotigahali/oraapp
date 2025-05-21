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
  const { currentData, loading,setCurrentPage,currentPage,errorFile } = props;
  console.log("currentData", currentData);
  useEffect(() => {
    if(activeTab === 'region' && currentData.length > 0) {
      const rolledUpByRegion = Object.values(
        currentData.reduce((acc, curr) => {
          const { resource, oraStudyId, protocol, phase, totalHrs,hrsPerUnit,country, units,plannedStart,plannedEnd, ...rest } = curr;      
          // Key to group by: combination of resource + oraStudyId + protocol
          const key = `${resource}|${oraStudyId}|${protocol}|${phase}`;
          const region = resource.split("-")[0]
          if (!acc[key]) {
            acc[key] = {
              ...rest, // All other fields (Department, Sponsor, etc.)
              resource,
              WorkItem: `${oraStudyId} - ${protocol}`,
              activity: phase,
              role: resource,
              start : plannedStart,
              end : plannedEnd,
              resourceRegion: country ? `${region}-${country}` : region,
              totalHrs: 0,
              units: 0,
              hrsPerUnit: 0,
              region: country,
              oraStudyId,
              protocol,
          }
        }
          acc[key].totalHrs += totalHrs;
          acc[key].units += units;
          acc[key].hrsPerUnit += hrsPerUnit;
      
          return acc;
        }, {})
      );
      
      // Convert the object back to an array
      let newArray = Object.values(rolledUpByRegion);
      console.log("rolledUp", newArray);  
      setScenerioOne(newArray);
    }

    if(activeTab === 'country' && currentData.length > 0) {
      const rolledUpByCountry = Object.values(
        currentData.reduce((acc, curr) => {
          const { resource, oraStudyId, protocol, phase, totalHrs,hrsPerUnit,country, units,plannedStart,plannedEnd, ...rest } = curr;
      
          // Key to group by: combination of resource + oraStudyId + protocol
          const key = `${country}|${oraStudyId}|${protocol}|${phase}`;
          const region = resource.split("-")[0]
          if (!acc[key]) {
            acc[key] = {
              ...rest, // All other fields (Department, Sponsor, etc.)
              resource,
              WorkItem: `${oraStudyId} - ${protocol}`,
              activity: phase,
              role: country ? `${region}-${country}` : region,
              start : plannedStart,
              end : plannedEnd,
              totalHrs: 0,
              units: 0,
              hrsPerUnit: 0,
              region: country,
          }
        }
          acc[key].totalHrs += totalHrs;
          acc[key].units += units;
          acc[key].hrsPerUnit += hrsPerUnit;
      
          return acc;
        }, {})
      );

      let newArray = Object.values(rolledUpByCountry);
      console.log("rolledUp", newArray);
      setScenerioTwo(newArray);
    }

    // if(activeTab === 'CRA/LCRA' && currentData.length > 0) {
    //   const rolledUpByCRA = Object.values(
    //     currentData.reduce((acc, curr) => {
    //       const { resource, oraStudyId, protocol, phase, totalHrs,hrsPerUnit,country, units,plannedStart,plannedEnd, ...rest } = curr;
    //       const [rolePrefix, regionCode] = resource.split("-");
    //       const isCRAType = rolePrefix === "CRA" || rolePrefix === "LCRA";
    //       // Key to group by: combination of resource + oraStudyId + protocol
    //       if(isCRAType){

    //       }
    //       const key = `${resource}|${oraStudyId}|${protocol}`;
    //       const region = resource.split("-")[0]
    //       if (!acc[key]) {
    //         acc[key] = {
    //           ...rest, // All other fields (Department, Sponsor, etc.)
    //           resource,
    //           WorkItem: `${oraStudyId} - ${protocol}`,
    //           activity: phase,
    //           role: resource,
    //           start : plannedStart,
    //           end : plannedEnd,
    //           totalHrs: 0,
    //           units: 0,
    //           hrsPerUnit: 0,
    //           region: country,
    //       }
    //     }
    //       acc[key].totalHrs += totalHrs;
    //       acc[key].units += units;
    //       acc[key].hrsPerUnit += hrsPerUnit;
      
    //       return acc;
    //     }, {})
    //   );
    //   let newArray = Object.values(rolledUpByCRA);
    //   console.log("rolledUpCRA/LCRA", newArray);  
    //   setScenerioThree(newArray);
    // }
  }, [activeTab, currentData]);

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
                <th>Phase</th>
                <th>Planned Start Date</th>
                <th>Planned Finish Date</th>
                <th>Country</th>
                <th>Site</th>
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
                  <td>{row.phase}</td>
                  <td>{row.plannedStart || ""}</td>
                  <td>{row.plannedEnd || ""}</td>
                  <td>{row.country || ""}</td>
                  <td>{row.site || ""}</td>
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
        {activeTab === 'CRA/LCRA' && ScenerioThree.length > 0 && <div className="tab-pane active">Content for Tab 4</div>}
      </div>
    </div>
  );
}

export default Categories;
