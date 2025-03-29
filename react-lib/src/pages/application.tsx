import React, { useState, useEffect } from 'react';
import { useSearchParams, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import Navbar from 'react-lib/src/components/page-setup/navbar';
import ToastMessage from '../components/page-setup/toast-message';
import { useInitNavigation } from 'react-lib/src/stores/store-router';
import { useSnapshotTokenStore } from '../stores/snapshot-token';
import {
  LandscapeToken,
  useLandscapeTokenStore,
} from '../stores/landscape-token';

export default function Application() {
  const [tokenId, setTokenId] = useState<string>('');
  const [searchParams, setSearchParams] = useSearchParams();

  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const retrieveToken = useSnapshotTokenStore((state) => state.retrieveToken);
  const setSnapshotToken = useSnapshotTokenStore((state) => state.setToken);
  const landscapeToken = useLandscapeTokenStore((state) => state.token);
  const setLandscapeToken = useLandscapeTokenStore((state) => state.setToken);

  const navigate = useNavigate();

  useInitNavigation();

  // equivalent to old auto-select-landscape
  useEffect(() => {
    const getLandscapeTokens = async () => {
      const uId = user?.sub;

      if (!uId) {
        throw new Error('Could not find user');
      }

      const encodedUid = encodeURI(uId);
      const response = await fetch(
        `${import.meta.env.VITE_USER_SERV_URL}/user/${encodedUid}/token`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Bad response from user service');
      }

      return (await response.json()) as LandscapeToken[];
    };

    const autoSelectLandscape = async () => {
      if (
        searchParams.get('owner') &&
        searchParams.get('createdAt') &&
        searchParams.get('sharedSnapshot') !== undefined
      ) {
        const token = await retrieveToken(
          searchParams.get('owner')!,
          +searchParams.get('createdAt')!,
          searchParams.get('sharedSnapshot') == 'true'
        );

        if (token !== null) {
          setSnapshotToken(token);
          navigate('/visualization');
        } else {
          navigate('/landscapes');
        }
      } else {
        if (
          !searchParams.get('landscapeToken') ||
          landscapeToken?.value === searchParams.get('landscapeToken')
        ) {
          return;
        }
        try {
          const tokens = await getLandscapeTokens();
          const selectedToken = tokens.find(
            (token) => token.value === searchParams.get('landscapeToken')
          );

          if (selectedToken) {
            setLandscapeToken(selectedToken);
            navigate('/visualization');
          } else {
            // Token not found => remove faulty query param
            navigate('/landscapes');
          }
        } catch (error) {
          console.error('Error in setUpLandscapeSelection:', error);
        }
      }
    };

    if (user) {
      autoSelectLandscape();
    }
  }, []);

  return (
    <>
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
