import { useAuthStore } from '../../stores/auth';

export default function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const isInitialized = useAuthStore((state) => state.isInitialized);

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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
