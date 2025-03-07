import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import Landscapes from './templates/landscapes.tsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landscapes />} />
    </Routes>
  </BrowserRouter>
);
