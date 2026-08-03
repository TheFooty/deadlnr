'use client';

import { useState, useEffect } from 'react';

export type DeviceType = 'phone' | 'tablet' | 'desktop';

export interface DeviceInfo {
  deviceType: DeviceType;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
}

export function useDevice(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    deviceType: 'desktop',
    isPhone: false,
    isTablet: false,
    isDesktop: true,
    hasTouch: false,
  });

  useEffect(() => {
    function detectDevice() {
      const width = window.innerWidth;
      const ua = navigator.userAgent;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // Check iPad specifically (including iPadOS on M-series Macs reporting MacIntel with touch points)
      const isIPad =
        /iPad/i.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      let type: DeviceType = 'desktop';

      if (width < 640 || (/iPhone|Android|Mobile/i.test(ua) && !isIPad)) {
        type = 'phone';
      } else if (isIPad || (width >= 640 && width < 1024 && hasTouch)) {
        type = 'tablet';
      } else {
        type = 'desktop';
      }

      setDeviceInfo({
        deviceType: type,
        isPhone: type === 'phone',
        isTablet: type === 'tablet',
        isDesktop: type === 'desktop',
        hasTouch,
      });
    }

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return deviceInfo;
}
