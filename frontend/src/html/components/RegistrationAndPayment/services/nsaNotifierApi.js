import axios from 'axios';

const NODE_BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://ecss-backend-node.azurewebsites.net';

export const sendNsaNotifierChange = async (payload) => {
  return axios.post(`${NODE_BASE_URL}/nsaNotifier`, {
    purpose: 'notifyChange',
    ...payload,
  });
};
