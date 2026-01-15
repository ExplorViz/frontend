import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { useLandscapeTokenStore } from '../../stores/landscape-token';

export default function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const skipLogin = useAuthStore((state) => state.skipLogin);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const setLandscapeToken = useLandscapeTokenStore((state) => state.setToken);
  const navigate = useNavigate();

  // Check if dev login button is enabled via environment variable
  const isDevLoginEnabled = import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true';

  // Check if automatic skip login is enabled via environment variable
  const isAutoSkipLoginEnabled =
    import.meta.env.VITE_ENABLE_SKIP_LOGIN === 'true';

  const handleSkipLogin = () => {
    skipLogin();

    // Set default token if available
    // Note: user will be set after skipLogin() is called
    const defaultToken = import.meta.env.VITE_ONLY_SHOW_TOKEN;
    if (defaultToken && defaultToken !== 'change-token') {
      // Get user sub from store or fallback to env variable
      const ownerId =
        useAuthStore.getState().user?.sub ||
        import.meta.env.VITE_DEV_USER_SUB ||
        '9000';
      const defaultLandscapeToken = {
        value: defaultToken,
        ownerId: ownerId,
        created: Date.now(),
        alias: 'Development Token',
        sharedUsersIds: [],
      };
      setLandscapeToken(defaultLandscapeToken);
      navigate('/visualization');
    } else {
      navigate('/landscapes');
    }
  };

  // Automatically skip login if VITE_ENABLE_SKIP_LOGIN is set
  useEffect(() => {
    if (isAutoSkipLoginEnabled && isInitialized) {
      handleSkipLogin();
    }
  }, [isAutoSkipLoginEnabled, isInitialized, handleSkipLogin]);

  return (
    <div className="login-page-container">
      <div className="login-page-background">
        <div className="login-page-background-overlay"></div>
      </div>
      <div className="login-page-content">
        {!isInitialized ? (
          <div className="login-page-card login-page-card-loading">
            <div className="login-page-loading-content">
              <div className="login-page-loading-spinner"></div>
              <p className="login-page-loading-text">
                Connecting to Keycloak...
              </p>
            </div>
          </div>
        ) : (
          <div className="login-page-card">
            <div className="login-page-card-header">
              <div className="login-page-logo">
                <img
                  src="images/explorviz-logo.png"
                  alt="ExplorViz"
                  className="login-page-logo-image"
                />
              </div>
              <h1 className="login-page-title">Welcome to ExplorViz</h1>
              <p className="login-page-subtitle">
                Please sign in to access your visualization workspace
              </p>
            </div>
            <div className="login-page-card-body">
              <button
                className="login-page-button login-page-button-primary"
                onClick={login}
                type="button"
              >
                <span className="login-page-button-label">
                  Sign In / Register
                </span>
                <span className="login-page-button-ripple"></span>
              </button>
              {isDevLoginEnabled && (
                <button
                  className="login-page-button login-page-button-secondary"
                  onClick={handleSkipLogin}
                  type="button"
                >
                  <span className="login-page-button-label">
                    Skip Login (Dev Mode)
                  </span>
                  <span className="login-page-button-ripple"></span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
