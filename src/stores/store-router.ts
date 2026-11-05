import { useEffect } from 'react';
import { Location, NavigateFunction, useLocation, useNavigate } from 'react-router-dom';
import { create } from 'zustand';

interface RouterStoreState {
  navigateTo: NavigateFunction | undefined;
  location: Location | undefined;
  getLocation: () => Location | undefined;
}

export const useRouterStore = create<RouterStoreState>((set, get) => ({
  navigateTo: undefined,
  location: undefined,
  getLocation: () => get().location,
}));

export const useInitNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    useRouterStore.setState({ navigateTo: navigate, location });
  }, [navigate, location]);
};
