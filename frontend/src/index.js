import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import InviteDetail from './pages/InviteDetail';
import ServerBrowser from './pages/ServerBrowser';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/servers" element={<ServerBrowser />} />
      <Route path="/invite/:code" element={<InviteDetail />} />
    </Routes>
  </BrowserRouter>
);
