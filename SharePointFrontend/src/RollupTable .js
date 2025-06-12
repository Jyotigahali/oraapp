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
      Comlexity: "Medium",
      Duration: loadMonths(item),
      // TotalHrs: item.totalHrs,      
      ...(activeTab === "region"
        ? { "Total Hrs Region": item.SiteHrs }
        : { "Total Hrs": item.totalHrs }),
      ...(activeTab === "country"
        ? { "Hrs Per Ctry": item.SiteHrs, Country: item.country }
        : {}),
      "Value(FTE)": loadFTE(item),
      CID: "",
      MID: "",
      MIM: "",
      // "_Resource Region": item.resourceRegion,
      "Resource Region": item.region,
      // "_Therapeutic Area":  item.therapeuticArea,
      "Therapeutic Area": item.Department,
      _Sponsor: item.Sponsor,
      "_Current Project Status": item.currentProjectStatus,
      _Indication: item.Indication,
      "_Enrollment Method": item.enrollmentMethod,
      "_Study Nickname": item.studyNumber,
      "_OraProject ID": item.oraStudyId,
      "_# of Sites": item.noOfSites,
      "_# of Countries": item.noOfCountries,
      "_Name of Country(ies)": item.nameOfCountries,
      [activeTab === "country" ? "Country" : ""]: activeTab === "country" ? item.country : "",
      // "_Study Site": item.site,    
    }));
    exportToCSV(csvData, `RoleUp_${activeTab}_RM_Demand.csv`);
  }

  const handleExportSchedule = (data) => {
    const csvData = data.map(item => ({
      WorkItem: item.WorkItem,
      Activity: item.activity,
      Begin: item.start,
      End: item.end,
      // Role: item.role,
      // "Resource Region": item.role,
      "Resource Region": item.region,
      //  "Therapeutic Area":  item.therapeuticArea,
      "Therapeutic Area": item.Department,
      Sponsor: item.Sponsor,
      "Current Project Status": item.currentProjectStatus,
      Indication: item.Indication,
      "Enrollment Method": item.enrollmentMethod,
      "Study Nickname": item.studyNumber,
      "OraProject ID": item.oraStudyId,
      "# of Sites": item.noOfSites,
      "# of Countries": item.noOfCountries,
      "Name of Country(ies)": item.nameOfCountries,
      "Study Site": item.site,
    }));
    exportToCSV(csvData, `RoleUp_${activeTab}_RM_Schedule.csv`);
  }

  const loadFTE = (row) => {
    const totalHrs = row.SiteHrs;
    let months = loadMonths(row)
    const fte = ((totalHrs / months) / 151.55).toFixed(2);
    return fte
  }
  const loadMonths = (row) => {
    const start = new Date(row.start);
    const end = new Date(row.end);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return "";
    }
    let fullMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

    // Add partial month from start
    const daysInStartMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const startMonthDaysUsed = daysInStartMonth - start.getDate() + 1;
    const startPartial = startMonthDaysUsed / daysInStartMonth;

    // Add partial month from end
    const daysInEndMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
    const endMonthDaysUsed = end.getDate();
    const endPartial = endMonthDaysUsed / daysInEndMonth;
    let months = (fullMonths + startPartial + endPartial - 1).toFixed(2); // subtract 1 because we counted both full ends
    return months
  }
  return (
    <div className="mt-3">
      <h4 className="my-2">Rolled Up By {activeTab?.toUpperCase()} </h4>
      <Button className="m-2" onClick={() => handleExportDemand(data)}>
        Export as CSV For RM: Demand
      </Button>
      <Button className="m-2" onClick={() => handleExportSchedule(data)}>
        Export as CSV For RM: Schedule
      </Button>
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
            <th>FTE</th>
            <th># of Sites</th>
            <th># of Countries</th>
            <th>Resource Region</th>
            <th>Region</th>
            <th>Name of Country</th>
            <th>Indecation</th>
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
              <td>{row.SiteHrs}</td>
              <td>{row.country}</td>
              <td>{row.Department}</td>
              <td>{row.Sponsor}</td>
              <td>{row.currentProjectStatus}</td>
              <td>{loadFTE(row)}</td>
              <td>{row.noOfSites}</td>
              <td>{row.noOfCountries}</td>
              <td>{row.resourceRegion}</td>
              <td>{row.region}</td>
              <td>{row.nameOfCountries}</td>
              <td>{row.Indication}</td>
              {/* Add more <td> if needed */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RollupTable;
