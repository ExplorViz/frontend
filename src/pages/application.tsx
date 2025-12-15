import LoginPage from 'explorviz-frontend/src/components/page-setup/login-page';
import Navbar from 'explorviz-frontend/src/components/page-setup/navbar';
import ToastMessage from 'explorviz-frontend/src/components/page-setup/toast-message';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { useSnapshotTokenStore } from 'explorviz-frontend/src/stores/snapshot-token';
import { useInitNavigation } from 'explorviz-frontend/src/stores/store-router';
import { useEffect, useState } from 'react';
import {
  createSearchParams,
  Outlet,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

export default function Application() {
  const [checkedLandscapeToken, setCheckedLandscapeToken] =
    useState<boolean>(false);
  const [searchParams, _] = useSearchParams();

  const user = useAuthStore((state) => state.user);
  const retrieveToken = useSnapshotTokenStore((state) => state.retrieveToken);
  const setSnapshotToken = useSnapshotTokenStore((state) => state.setToken);
  const landscapeToken = useLandscapeTokenStore((state) => state.token);
  const setLandscapeToken = useLandscapeTokenStore((state) => state.setToken);
  const retrieveTokens = useLandscapeTokenStore(
    (state) => state.retrieveTokens
  );

  const navigate = useNavigate();

  useInitNavigation();

  // Handle skip login token setup
  useEffect(() => {
    const isSkipLoginEnabled = import.meta.env.VITE_ENABLE_SKIP_LOGIN === 'true';

    if (isSkipLoginEnabled && user) {
      // Set default token if available
      const defaultToken = import.meta.env.VITE_ONLY_SHOW_TOKEN;
      if (defaultToken && defaultToken !== 'change-token') {
        const defaultLandscapeToken = {
          value: defaultToken,
          ownerId: user.sub,
          created: Date.now(),
          alias: 'Development Token',
          sharedUsersIds: [],
        };
        setLandscapeToken(defaultLandscapeToken);
        // Only navigate if we're not already on a route
        if (window.location.pathname === '/') {
          navigate('/visualization');
        }
      }
    }
  }, [user, setLandscapeToken, navigate]);

  // Auto-select landscape
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
  }, [searchParams, user]);

  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isInitialized || !isAuthenticated) {
    return <LoginPage />;
  }

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
