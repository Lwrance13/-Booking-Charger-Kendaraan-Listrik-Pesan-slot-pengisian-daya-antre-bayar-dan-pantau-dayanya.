import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { Animated } from 'react-native';

interface DrawerContextType {
  open: () => void;
  close: () => void;
  slideAnim: Animated.Value;
  visible: boolean;
}

const DrawerContext = createContext<DrawerContextType | null>(null);

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;

  const open = useCallback(() => {
    setVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
  }, [slideAnim]);

  const close = useCallback(() => {
    Animated.timing(slideAnim, { toValue: -300, duration: 220, useNativeDriver: true }).start(
      () => setVisible(false)
    );
  }, [slideAnim]);

  return (
    <DrawerContext.Provider value={{ open, close, slideAnim, visible }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error('useDrawer must be used inside DrawerProvider');
  return ctx;
}
