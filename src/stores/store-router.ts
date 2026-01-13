import {
  Location,
  NavigateFunction,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { create } from 'zustand';

interface RouterStoreState {
  navigateTo: NavigateFunction | undefined;
  getLocation: () => Location<any>;
}

export const useRouterStore = create<RouterStoreState>((set, get) => ({
  navigateTo: undefined,
  /* eslint-disable react-hooks/rules-of-hooks */
  getLocation: () => {
    const location = useLocation();
    return location;
  },
}));

export const useInitNavigation = () => {
  const navigate = useNavigate();

  useRouterStore.setState({ navigateTo: navigate });
};
