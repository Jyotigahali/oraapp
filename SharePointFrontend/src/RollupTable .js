// RollupTable.js
import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Button } from 'react-bootstrap';

const RollupTable = ({ data, exportToCSV, activeTab }) => {
  console.log("RollupTable data", data);
  const handleExportDemand = (data) => {
    const csvData = data.map(item => ({
      WorkItem: item.WorkItem,
      Activity: item.activity,
      Begin: item.start,
      End: item.end,
      Role: item.role,
      Value: item.totalHrs,
      Comlexity: "Medium",
      CID: "",
      MID:"",
      MIM:"",
      Region: item.region,
      "_Therapeutic Area": "",
      _Department: item.Department,
      _Sponsor: item.Sponsor,
      "_Current Project Status": item.currentProjectStatus,
      _Indication:item.Indication,
      "_Enrollment Method":item.enrollmentMethod,
      "_Study Number": "",
      "_OraProject ID": "",
      "_#ofSites": "",
      "_#ofCountries": "",
      "_Name of Country": "",
      "_Study Site": item.site,    
    }));
    exportToCSV(csvData, `RoleUp_${activeTab}_RM_Demand.csv`); 
  }

  const handleExportSchedule = (data) => {
    const csvData = data.map(item => ({
      WorkItem: item.WorkItem,
      Activity: item.activity,
      Begin: item.start,
      End: item.end,
      Region: item.region,
     "_Therapeutic Area": "",
      _Department: item.Department,
      _Sponsor: item.Sponsor,
      "_Current Project Status": item.currentProjectStatus,
      _Indication:item.Indication,
      "_Enrollment Method":item.enrollmentMethod,
      "_Study Number": "",
      "_OraProject ID": "",
      "_#ofSites": "",
      "_#ofCountries": "",
      "_Name of Country": "",
      "_Study Site": item.site, 
    }));
    exportToCSV(csvData, `RoleUp_${activeTab}_RM_Schedule.csv`);
  }
  return (
    <div className="container mt-3">
      <Button className="m-2" onClick={ () => handleExportDemand(data)}>
            Export as CSV For RM: Demand
      </Button>
      <Button className="m-2" onClick={() => handleExportSchedule(data)}>
            Export as CSV For RM: Schedule
      </Button>
      <h4>Rolled Up Resource Table</h4>
      <table className="table table-bordered table-striped">
        <thead className="table-light">
          <tr>
            <th>Sl. No</th>
            <th>WorkItem</th>
            <th>Activity</th>
            <th>Role</th>
            <th>Start</th>
            <th>End</th>
            <th>Hours</th>
            <th>Country</th>
            <th>Department</th>
            <th>Sponsor</th>
            <th>Project Status</th>
            {/* Add any other columns you want to display */}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              <td>{idx + 1}</td>
              <td>{row.WorkItem}</td>
              <td>{row.activity}</td>
              <td>{row.role}</td>
              <td>{row.start}</td>
              <td>{row.end}</td>
              <td>{row.totalHrs}</td>
              <td>{row.region}</td>
              <td>{row.Department}</td>
              <td>{row.Sponsor}</td>
              <td>{row.currentProjectStatus}</td>
              {/* Add more <td> if needed */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RollupTable;
