import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import Landscapes from './pages/landscapes.tsx';
import Application from './pages/application.tsx';
import Settings from './pages/settings.tsx';
// import Visualization from './pages/visualization.tsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-lib/src/scss/app.scss';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route element={<Application />}>
        <Route path="/" element={<Navigate to="/landscapes" />} />
        <Route path="/landscapes" element={<Landscapes />} />
        <Route path="/visualization">
          {/* <Route index element={<Visualization />} />
          <Route path="/visualization/:mode" element={<Visualization />} /> */}
        </Route>
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/landscapes" />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
