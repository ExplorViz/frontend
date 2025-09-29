import { useState, useEffect } from 'react';
import {
  useSearchParams,
  Outlet,
  useNavigate,
  createSearchParams,
} from 'react-router-dom';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import Navbar from 'explorviz-frontend/src/components/page-setup/navbar';
import ToastMessage from 'explorviz-frontend/src/components/page-setup/toast-message';
import { useInitNavigation } from 'explorviz-frontend/src/stores/store-router';
import { useSnapshotTokenStore } from 'explorviz-frontend/src/stores/snapshot-token';
import {
  LandscapeToken,
  useLandscapeTokenStore,
} from 'explorviz-frontend/src/stores/landscape-token';

export default function Application() {
  const [tokenId, setTokenId] = useState<string>('');
  const [checkedLandscapeToken, setCheckedLandscapeToken] =
    useState<boolean>(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const retrieveToken = useSnapshotTokenStore((state) => state.retrieveToken);
  const setSnapshotToken = useSnapshotTokenStore((state) => state.setToken);
  const landscapeToken = useLandscapeTokenStore((state) => state.token);
  const setLandscapeToken = useLandscapeTokenStore((state) => state.setToken);
  const retrieveTokens = useLandscapeTokenStore(
    (state) => state.retrieveTokens
  );

  const navigate = useNavigate();

  useInitNavigation();

  // equivalent to old auto-select-landscape
  useEffect(() => {
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
          setCheckedLandscapeToken(true);
          return;
        }
        try {
          const tokens = await retrieveTokens();
          const selectedToken = tokens.find(
            (token) => token.value === searchParams.get('landscapeToken')
          );

          if (selectedToken) {
            setLandscapeToken(selectedToken);
            // Navigate to visualization (if not yet there)
            setCheckedLandscapeToken(true);
            navigate({
              pathname: '/visualization',
              search: `?${createSearchParams({ landscapeToken: selectedToken.value })}`,
            });
          } else {
            // Token not found => remove faulty query param
            navigate('/landscapes');
          }
        } catch (error) {
          setCheckedLandscapeToken(true);
          console.error('Error in setUpLandscapeSelection:', error);
        }
      }
    };

    if (user) {
      autoSelectLandscape();
    }
  }, [searchParams]);

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
        {checkedLandscapeToken && <Outlet />}
      </div>
    </>
  );
}
