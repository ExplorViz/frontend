import React, { useState } from 'react';
import { useSearchParams, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import Navbar from 'react-lib/src/components/page-setup/navbar';
// import AutoSelectLandscape from '../components/collaboration/auto-select-landscape';
import ToastMessage from '../components/page-setup/toast-message';
import { useInitNavigation } from 'react-lib/src/stores/store-router';

// TODO: Uncomment AutoSelect after it exists

export default function Application() {
  const [tokenId, setTokenId] = useState<string>('');
  let [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);

  useInitNavigation();

  return (
    <>
      {/* <AutoSelectLandscape
        landscapeToken={searchParams.get('landscapeToken')}
      /> */}
      <div id="ember-right-click-menu-wormhole"></div>
      <div id="main-container">
        {user && (
          <>
            <Navbar />
            <ToastMessage />
          </>
        )}
        <Outlet />
      </div>
    </>
  );
}
