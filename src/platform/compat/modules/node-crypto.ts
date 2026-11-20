import { cryptoShim } from '../node-shims';
export default cryptoShim;
export const createHash = cryptoShim.createHash;
export const randomBytes = cryptoShim.randomBytes;
export const randomUUID = cryptoShim.randomUUID;
