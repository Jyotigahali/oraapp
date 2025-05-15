// App.js
import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function Categories(props) {
  const [activeTab, setActiveTab] = useState('tab1');
  const [ScenerioOne, setScenerioOne] = useState([]);
  const [ScenerioTwo, setScenerioTwo] = useState([]);
  const [ScenerioThree, setScenerioThree] = useState([])
  const { currentData } = props;
  if(activeTab === 'tab1') {
  }
  console.log(currentData)
  return (
    <div className="container mt-4">
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
            className={`nav-link ${activeTab === 'tab2' ? 'active' : ''}`}
            onClick={() => setActiveTab('tab2')}
          >
            Scenerio One
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'tab3' ? 'active' : ''}`}
            onClick={() => setActiveTab('tab3')}
          >
             Scenerio two
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'tab4' ? 'active' : ''}`}
            onClick={() => setActiveTab('tab4')}
          >
             Scenerio three
          </button>
        </li>
      </ul>

      <div className="tab-content mt-3">
        {activeTab === 'tab1' && <div className="tab-pane active">Content for Tab 1</div>}
        {activeTab === 'tab2' && <div className="tab-pane active">Content for Tab 2</div>}
        {activeTab === 'tab3' && <div className="tab-pane active">Content for Tab 3</div>}
        {activeTab === 'tab4' && <div className="tab-pane active">Content for Tab 4</div>}
      </div>
    </div>
  );
}

export default Categories;
