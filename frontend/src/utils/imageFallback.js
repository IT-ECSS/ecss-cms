export const fallbackToRemoteImage = (event, remoteSrc) => {
  const image = event.currentTarget;
  if (image.dataset.remoteFallbackAttempted === 'true') return;

  image.dataset.remoteFallbackAttempted = 'true';
  image.src = remoteSrc;
};