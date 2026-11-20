import { fsShim } from '../node-shims';
export default fsShim;
export const existsSync = fsShim.existsSync;
export const mkdirSync = fsShim.mkdirSync;
export const readFileSync = fsShim.readFileSync;
export const writeFileSync = fsShim.writeFileSync;
export const promises = fsShim.promises;
