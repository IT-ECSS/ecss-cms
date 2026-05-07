import { useState, useCallback } from 'react';

export const usePopup = () => {
  const [popup, setPopup] = useState(null);

  const showPopup = useCallback((config) => {
    setPopup(config);
  }, []);

  const closePopup = useCallback(() => {
    setPopup(null);
  }, []);

  const showLoading = useCallback((message = 'Loading...') => {
    showPopup({
      type: 'loading',
      message
    });
  }, [showPopup]);

  const showSuccess = useCallback((message) => {
    showPopup({
      type: 'success',
      message
    });
  }, [showPopup]);

  const showError = useCallback((message) => {
    showPopup({
      type: 'error',
      message
    });
  }, [showPopup]);

  const showConfirmation = useCallback((config) => {
    showPopup({
      type: 'confirmation',
      ...config
    });
  }, [showPopup]);

  const showInput = useCallback((config) => {
    showPopup({
      type: 'input',
      ...config
    });
  }, [showPopup]);

  const showSelection = useCallback((config) => {
    showPopup({
      type: 'selection',
      ...config
    });
  }, [showPopup]);

  return {
    popup,
    showPopup,
    closePopup,
    showLoading,
    showSuccess,
    showError,
    showConfirmation,
    showInput,
    showSelection
  };
};
