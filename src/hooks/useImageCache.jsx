import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for caching images in sessionStorage and memory
 * Prevents unnecessary re-downloads of profile photos across pages
 * 
 * @returns {Object} Cache methods
 */
const useImageCache = () => {
  const [cache, setCache] = useState(new Map());
  const [invalidUrls, setInvalidUrls] = useState(new Set());
  const loadingRef = useRef(new Set());
  
  // Load cache from sessionStorage on mount
  useEffect(() => {
    try {
      const cachedData = sessionStorage.getItem('nextgen_image_cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setCache(new Map(Object.entries(parsed)));
      }

      const invalidData = sessionStorage.getItem('nextgen_invalid_image_urls');
      if (invalidData) {
        const parsedInvalid = JSON.parse(invalidData);
        setInvalidUrls(new Set(parsedInvalid));
      }
    } catch (error) {
      console.error('Error loading image cache:', error);
    }
  }, []);
  
  // Save cache to sessionStorage whenever it changes
  useEffect(() => {
    try {
      const cacheObject = Object.fromEntries(cache);
      sessionStorage.setItem('nextgen_image_cache', JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Error saving image cache:', error);
    }
  }, [cache]);

  useEffect(() => {
    try {
      sessionStorage.setItem('nextgen_invalid_image_urls', JSON.stringify(Array.from(invalidUrls)));
    } catch (error) {
      console.error('Error saving invalid image URLs:', error);
    }
  }, [invalidUrls]);
  
  /**
   * Get cached image URL
   */
  const getImage = useCallback((url) => {
    if (!url) return null;
    return cache.get(url) || null;
  }, [cache]);
  
  /**
   * Preload and cache an image
   */
  const cacheImage = useCallback((url) => {
    if (!url || cache.has(url) || invalidUrls.has(url) || loadingRef.current.has(url)) {
      return Promise.resolve(cache.get(url) || url);
    }
    
    loadingRef.current.add(url);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        setCache(prev => {
          const newCache = new Map(prev);
          newCache.set(url, url);
          return newCache;
        });
        loadingRef.current.delete(url);
        resolve(url);
      };
      
      img.onerror = (error) => {
        loadingRef.current.delete(url);
        setInvalidUrls(prev => {
          const newInvalid = new Set(prev);
          newInvalid.add(url);
          return newInvalid;
        });
        reject(error);
      };
      
      img.src = url;
    });
  }, [cache, invalidUrls]);
  
  /**
   * Batch cache multiple images
   */
  const cacheImages = useCallback(async (urls) => {
    const validUrls = urls.filter(url => url && !cache.has(url) && !invalidUrls.has(url) && !loadingRef.current.has(url));
    
    if (validUrls.length === 0) return;

    const results = await Promise.allSettled(validUrls.map(url => cacheImage(url)));
    const failedCount = results.filter(result => result.status === 'rejected').length;

    // Broken image URLs are expected sometimes; avoid noisy error logs in the console.
    if (failedCount > 0 && import.meta.env.DEV) {
      console.debug(`[ImageCache] Skipped ${failedCount} invalid image URL(s).`);
    }
  }, [cache, invalidUrls, cacheImage]);
  
  /**
   * Check if image is cached
   */
  const isCached = useCallback((url) => {
    return cache.has(url);
  }, [cache]);

  /**
   * Check if image URL has already been validated as broken/unavailable
   */
  const isInvalidImage = useCallback((url) => {
    if (!url) return false;
    return invalidUrls.has(url);
  }, [invalidUrls]);

  /**
   * Mark an image URL as invalid from UI-level onError handlers
   */
  const markInvalidImage = useCallback((url) => {
    if (!url) return;
    setInvalidUrls(prev => {
      const newInvalid = new Set(prev);
      newInvalid.add(url);
      return newInvalid;
    });
  }, []);
  
  /**
   * Clear all cached images
   */
  const clearCache = useCallback(() => {
    setCache(new Map());
    setInvalidUrls(new Set());
    sessionStorage.removeItem('nextgen_image_cache');
    sessionStorage.removeItem('nextgen_invalid_image_urls');
    loadingRef.current.clear();
  }, []);
  
  /**
   * Remove specific image from cache
   */
  const removeImage = useCallback((url) => {
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(url);
      return newCache;
    });

    setInvalidUrls(prev => {
      const newInvalid = new Set(prev);
      newInvalid.delete(url);
      return newInvalid;
    });
  }, []);
  
  return {
    getImage,
    cacheImage,
    cacheImages,
    isCached,
    isInvalidImage,
    markInvalidImage,
    clearCache,
    removeImage,
    cacheSize: cache.size
  };
};

export default useImageCache;
