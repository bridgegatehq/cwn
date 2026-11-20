import { bcryptShim } from '../bcrypt-shim';
export default bcryptShim;
export const hashSync = bcryptShim.hashSync;
export const compareSync = bcryptShim.compareSync;
export const hash = bcryptShim.hash;
export const compare = bcryptShim.compare;
