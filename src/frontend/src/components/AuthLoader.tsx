import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';

interface AuthLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AuthLoader: React.FC<AuthLoaderProps> = ({ 
  children, 
  fallback = <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Loading...</div> 
}) => {
  const { checkAuth, isLoading, user } = useAuthStore();
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      await checkAuth();
      setInitialCheckDone(true);
    };
    
    if (!initialCheckDone) {
      verifyAuth();
    }
  }, [checkAuth, initialCheckDone]);

  if (isLoading || !initialCheckDone) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};