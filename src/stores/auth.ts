import { create } from 'zustand';

interface AuthState {
  user: AuthenticatedUser | undefined;
  accessToken: string | undefined;
}

export const useAuthStore = create<AuthState>((/*set, get*/) => ({
  user: {
    name: getRandomName(),
    nickname: import.meta.env.VITE_AUTH_DISABLED_NICKNAME,
    sub: import.meta.env.VITE_AUTH_DISABLED_SUB,
  },
  accessToken: import.meta.env.VITE_AUTH_DISABLED_ACCESS_TOKEN,
}));

function getRandomName() {
  const NAMES = [
    'Alex',
    'Angel',
    'Arden',
    'Ari',
    'Aspen',
    'August',
    'Avery',
    'Baylor',
    'Billie',
    'Blair',
    'Blake',
    'Blake',
    'Cameron',
    'Casey',
    'Charlie',
    'Dakota',
    'Devon',
    'Drew',
    'Ellis',
    'Frankie',
    'Grey',
    'Harley',
    'Indigo',
    'Jamie',
    'Jesse',
    'Jordan',
    'Justice',
    'Kai',
    'London',
    'Micah',
    'Morgan',
    'Parker',
    'Phoenix',
    'Quinn',
    'Reese',
    'Remy',
    'Riley',
    'River',
    'Rowan',
    'Sage',
    'Sam',
    'Sasha',
    'Skyler',
    'Spencer',
    'Sydney',
    'Tatum',
    'Taylor',
    'Winter',
  ];
  const randomIndex = Math.floor(Math.random() * NAMES.length);
  return NAMES[randomIndex];
}

export type AuthenticatedUser = {
  name: string;
  nickname: string;
  sub: string;
};
