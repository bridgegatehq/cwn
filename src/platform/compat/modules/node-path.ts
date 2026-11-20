import { pathShim } from '../node-shims';
export default pathShim;
export const resolve = pathShim.resolve;
export const join = pathShim.join;
export const dirname = pathShim.dirname;
export const basename = pathShim.basename;
export const extname = pathShim.extname;
