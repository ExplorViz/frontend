import { useState, useEffect } from 'react';
import {
  useUserApiTokenStore,
  ApiToken,
} from 'explorviz-frontend/src/stores/user-api-token';
import ApiTokenSelection from 'explorviz-frontend/src/components/api-token-selection';

export default function Settings() {
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [apiTokens, setApiTokens] = useState<ApiToken[]>([]);

  const retrieveApiTokens = useUserApiTokenStore(
    (state) => state.retrieveApiTokens
  );

  useEffect(() => {
    const fetchData = async () => {
      const apiTokens = await retrieveApiTokens();

      setApiTokens(apiTokens);
    };

    fetchData();
  }, [refreshKey]);

  const refreshRoute = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div
      className={'container overflow-auto mt-5 mb-5 d-flex flex-column flex-1'}
    >
      <h4 className={'text-center mt-4 mb-3'}>Settings</h4>
      <div className={'d-flex flex-row justify-content-center overflow-auto'}>
        <ApiTokenSelection apiTokens={apiTokens} refreshRoute={refreshRoute} />
      </div>
    </div>
  );
}
