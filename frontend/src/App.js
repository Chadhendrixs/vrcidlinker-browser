import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL;

function App() {
  const [servers, setServers] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/servers`)
      .then(res => res.json())
      .then(setServers);
  }, []);

  return (
    <div>
      <h1>Server Directory</h1>
      {servers.map((server, i) => (
        <div key={i} style={{ marginBottom: "1rem" }}>
          <Link to={`/invite/${server.invite_code}`}>
            <h2>{server.invite_code}</h2>
          </Link>
          <p>Tags: {server.tags}</p>
        </div>
      ))}
    </div>
  );
}

export default App;
