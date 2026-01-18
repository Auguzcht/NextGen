import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for caching images in sessionStorage and memory
 * Prevents unnecessary re-downloads of profile photos across pages
 * 
 * @returns {Object} Cache methods
 */
const useImageCache = () => {
  const [cache, setCache] = useState(new Map());
  const loadingRef = useRef(new Set());
  
  // Load cache from sessionStorage on mount
  useEffect(() => {
    try {
      const cachedData = sessionStorage.getItem('nextgen_image_cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setCache(new Map(Object.entries(parsed)));
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
    if (!url || cache.has(url) || loadingRef.current.has(url)) {
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
        reject(error);
      };
      
      img.src = url;
    });
  }, [cache]);
  
  /**
   * Batch cache multiple images
   */
  const cacheImages = useCallback(async (urls) => {
    const validUrls = urls.filter(url => url && !cache.has(url) && !loadingRef.current.has(url));
    
    if (validUrls.length === 0) return;
    
    try {
      await Promise.all(validUrls.map(url => cacheImage(url)));
    } catch (error) {
      console.error('Error batch caching images:', error);
    }
  }, [cache, cacheImage]);
  
  /**
   * Check if image is cached
   */
  const isCached = useCallback((url) => {
    return cache.has(url);
  }, [cache]);
  
  /**
   * Clear all cached images
   */
  const clearCache = useCallback(() => {
    setCache(new Map());
    sessionStorage.removeItem('nextgen_image_cache');
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
  }, []);
  
  return {
    getImage,
    cacheImage,
    cacheImages,
    isCached,
    clearCache,
    removeImage,
    cacheSize: cache.size
  };
};

export default useImageCache;
