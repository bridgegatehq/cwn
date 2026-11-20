import { webpushShim } from '../webpush-shim';
const instance = webpushShim();
export default instance;
export const generateVAPIDKeys = instance.generateVAPIDKeys;
export const setVapidDetails = instance.setVapidDetails;
export const sendNotification = instance.sendNotification;
