import { useNavigate } from "react-router-dom";
import React from "react";
import { Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";  


const navigate = useNavigate();
const App = () => {
 <button
  className="btn btn-success m-2"
  onClick={() => navigate("/employee-automation")}
>
  Employee Automation
</button>

  };      