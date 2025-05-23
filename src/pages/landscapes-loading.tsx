import React from 'react';
import ContentLoader from 'react-content-loader';

const LandscapeLoader = () => (
  <div className="container overflow-hidden mt-5 mb-5 d-flex flex-column flex-1">
    <div className="d-flex flex-row justify-content-center mt-5">
      <ContentLoader width={400} height={300} speed={2}>
        <rect x="50" y="0" rx="12" ry="12" width="300" height="24" />
        <rect x="0" y="100" rx="12" ry="12" width="50" height="24" />
        <rect x="0" y="160" rx="12" ry="12" width="70" height="24" />
        <circle cx="648" cy="72" r="12" />
        <circle cx="688" cy="72" r="12" />
        <rect x="0" y="140" rx="0" ry="0" width="700" height="4" />
        <rect x="0" y="220" rx="12" ry="12" width="70" height="24" />
        <circle cx="648" cy="132" r="12" />
        <rect x="0" y="200" rx="0" ry="0" width="700" height="2" />
        <circle cx="648" cy="192" r="12" />
        <circle cx="688" cy="192" r="12" />
        <circle cx="648" cy="252" r="12" />
        <circle cx="688" cy="252" r="12" />
        <circle cx="688" cy="132" r="12" />
        <rect x="100" y="100" rx="12" ry="12" width="50" height="24" />
        <rect x="100" y="160" rx="12" ry="12" width="85" height="24" />
        <rect x="100" y="220" rx="12" ry="12" width="85" height="24" />
        <rect x="410" y="0" rx="12" ry="12" width="70" height="24" />
        <rect x="410" y="60" rx="12" ry="12" width="200" height="24" />
        <rect x="410" y="120" rx="12" ry="12" width="200" height="24" />
        <rect x="410" y="180" rx="12" ry="12" width="200" height="24" />
        <rect x="410" y="240" rx="12" ry="12" width="200" height="24" />
        <rect x="0" y="80" rx="0" ry="0" width="700" height="4" />
        <circle cx="221" cy="173" r="13" />
        <circle cx="261" cy="173" r="13" />
        <circle cx="301" cy="173" r="13" />
        <circle cx="341" cy="173" r="13" />
        <circle cx="221" cy="233" r="13" />
        <circle cx="261" cy="233" r="13" />
        <circle cx="301" cy="233" r="13" />
        <circle cx="341" cy="233" r="13" />
        <rect x="178" y="258" rx="6" ry="6" width="35" height="35" />
      </ContentLoader>
    </div>
  </div>
);

export default LandscapeLoader;
