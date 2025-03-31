import { create } from 'zustand';
import {
  NavigateFunction,
  useNavigate,
  useLocation,
  Location,
} from 'react-router-dom';

interface RouterStoreState {
  navigateTo: NavigateFunction | undefined;
  getLocation: () => Location<any>;
}

export const useRouterStore = create<RouterStoreState>((set, get) => ({
  navigateTo: undefined,
  getLocation: () => {
    const location = useLocation();
    return location;
  },
}));

export const useInitNavigation = () => {
  const navigate = useNavigate();

  useRouterStore.setState({ navigateTo: navigate });
};
