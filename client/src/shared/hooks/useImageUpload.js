import { useState } from 'react';
import { uploadImage } from '../services/api';

// Shared image-upload state for the item forms: the hosted imageUrl, an
// "uploading" flag, and a file-input handler that POSTs to /uploads/image.
// `onError` surfaces a failure through the caller's existing error channel.
export default function useImageUpload(token, { initialUrl = '', onError } = {}) {
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onError?.('');
    setUploading(true);
    try {
      setImageUrl(await uploadImage(file, token));
    } catch (err) {
      onError?.(err.message);
    } finally {
      setUploading(false);
    }
  };

  return { imageUrl, setImageUrl, uploading, handleFile };
}
