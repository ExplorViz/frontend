import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import Landscapes from './pages/landscapes.tsx';
import Application from './pages/application.tsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route element={<Application />}>
        <Route path="/" element={<Navigate to="/landscapes" />} />
        <Route path="/landscapes" element={<Landscapes />} />
        {/* <Route path="/visualization" element={<Visualization />} /> */}
        {/* <Route path="/settings" element={<Settings />} /> */}
        <Route path="*" element={<Navigate to="/landscapes" />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
