export function encryptAES256(data: any, secret: string): {
  iv: string;
  payload: string;
};
