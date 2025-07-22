// Memory monitoring hook
import { useState, useEffect, useCallback } from 'react';

interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
  isHigh: boolean;
  isCritical: boolean;
}

export const useMemoryMonitor = (interval: number = 5000) => {
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const getMemoryStats = useCallback((): MemoryStats | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      const totalMB = memory.totalJSHeapSize / (1024 * 1024);
      const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
      const usagePercentage = (usedMB / limitMB) * 100;
      
      return {
        usedJSHeapSize: usedMB,
        totalJSHeapSize: totalMB,
        jsHeapSizeLimit: limitMB,
        usagePercentage,
        isHigh: usagePercentage > 70,
        isCritical: usagePercentage > 90
      };
    }
    return null;
  }, []);

  const triggerGarbageCollection = useCallback(() => {
    if ('gc' in window) {
      (window as any).gc();
      console.log('Garbage collection triggered');
    }
  }, []);

  useEffect(() => {
    const supported = 'memory' in performance;
    setIsSupported(supported);
    
    if (!supported) return;

    const updateMemoryStats = () => {
      const stats = getMemoryStats();
      setMemoryStats(stats);
      
      if (stats?.isCritical) {
        console.warn('Critical memory usage detected:', stats.usagePercentage.toFixed(2) + '%');
        triggerGarbageCollection();
      }
    };

    updateMemoryStats();
    const intervalId = setInterval(updateMemoryStats, interval);

    return () => clearInterval(intervalId);
  }, [interval, getMemoryStats, triggerGarbageCollection]);

  return {
    memoryStats,
    isSupported,
    triggerGarbageCollection,
    getMemoryStats
  };
};