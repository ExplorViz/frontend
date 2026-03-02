import CryptoJS from "crypto-js";

export const generateRandomToken = (length: number = 32): string => {
  return CryptoJS.lib.WordArray.random(length).toString();
};