const SINGPASS_AUTH_KEYS = [
  'singpass_state',
  'singpass_nonce',
  'singpass_code_verifier',
  'singpass_return_path',
];
const SINGPASS_TAB_KEY = 'ecss_singpass_tab_id';
const SINGPASS_TAB_NAME_PREFIX = 'ecss-singpass-tab:';

export const ensureSingPassTabSession = () => {
  try {
    const storedTabId = sessionStorage.getItem(SINGPASS_TAB_KEY);
    let tabId = window.name.startsWith(SINGPASS_TAB_NAME_PREFIX) ? window.name : '';

    if (!tabId || (storedTabId && storedTabId !== tabId)) {
      tabId = `${SINGPASS_TAB_NAME_PREFIX}${window.crypto.randomUUID()}`;
      window.name = tabId;
    }

    let hasUnclaimedSingPassData = false;
    if (!storedTabId) {
      for (let index = 0; index < sessionStorage.length; index += 1) {
        if (sessionStorage.key(index)?.startsWith('singpass_')) {
          hasUnclaimedSingPassData = true;
          break;
        }
      }
    }

    const isNewTabSession = storedTabId
      ? storedTabId !== tabId
      : hasUnclaimedSingPassData;
    sessionStorage.setItem(SINGPASS_TAB_KEY, tabId);
    return isNewTabSession;
  } catch (error) {
    console.error('Error checking SingPass tab session:', error);
    return false;
  }
};

export const restoreSingPassTabSession = () => {
  try {
    const tabId = sessionStorage.getItem(SINGPASS_TAB_KEY);
    if (tabId?.startsWith(SINGPASS_TAB_NAME_PREFIX)) {
      window.name = tabId;
    }
  } catch (error) {
    console.error('Error restoring SingPass tab session:', error);
  }
};

export const clearSingPassAuthState = () => {
  try {
    SINGPASS_AUTH_KEYS.forEach((key) => sessionStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing SingPass authentication state:', error);
  }
};

export const clearSingPassSessionData = () => {
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index);
      if (key && key.startsWith('singpass_')) {
        sessionStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error('Error clearing SingPass session data:', error);
  }
};

export const getSingPassUserDataJSON = () => {
  try {
    // Try to get the JSON version first
    const jsonData = sessionStorage.getItem('singpass_user_data_json');
    if (jsonData) {
      return JSON.parse(jsonData);
    }
    
    // Fallback: reconstruct from individual fields
    console.log('JSON version not found, reconstructing from individual fields');
    return {
      name: sessionStorage.getItem('singpass_user_data_name') || null,
      uinfin: sessionStorage.getItem('singpass_user_data_uinfin') || null,
      residentialstatus: sessionStorage.getItem('singpass_user_data_residentialstatus') || null,
      race: sessionStorage.getItem('singpass_user_data_race') || null,
      sex: sessionStorage.getItem('singpass_user_data_sex') || null,
      dob: sessionStorage.getItem('singpass_user_data_dob') || null,
      mobileno: sessionStorage.getItem('singpass_user_data_mobileno') || null,
      email: sessionStorage.getItem('singpass_user_data_email') || null,
      regadd: sessionStorage.getItem('singpass_user_data_regadd') || null,
      timestamp: parseInt(sessionStorage.getItem('singpass_user_data_timestamp') || '0'),
      source: 'singpass'
    };
  } catch (error) {
    console.error('Error retrieving SingPass user data:', error);
    return null;
  }
};