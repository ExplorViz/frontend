import 'bootstrap/dist/css/bootstrap.min.css';
import Application from 'explorviz-frontend/src/pages/application.tsx';
import Landscapes from 'explorviz-frontend/src/pages/landscapes.tsx';
import Settings from 'explorviz-frontend/src/pages/settings.tsx';
import Visualization from 'explorviz-frontend/src/pages/visualization.tsx';
import 'explorviz-frontend/src/scss/app.scss';
import 'explorviz-frontend/src/utils/prototype-extensions/instancedmesh2.js';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route element={<Application />}>
        <Route path="/" element={<Navigate to="/landscapes" />} />
        <Route path="/landscapes" element={<Landscapes />} />
        <Route path="/visualization">
          <Route index element={<Visualization />} />
          <Route path="/visualization/:mode" element={<Visualization />} />
        </Route>
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/landscapes" />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
