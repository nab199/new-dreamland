import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  networkType: Network.NetworkStateType | null;
}

export function useNetworkStatus() {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: false,
    isInternetReachable: null,
    networkType: null,
  });

  useEffect(() => {
    checkNetwork();

    // Subscribe to network state updates
    const subscription = Network.addNetworkStateListener((state) => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        networkType: state.type ?? null,
      });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkNetwork = async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        networkType: state.type ?? null,
      });
    } catch (error) {
      console.error('Network check error:', error);
      setNetworkState({
        isConnected: false,
        isInternetReachable: false,
        networkType: null,
      });
    }
  };

  return {
    ...networkState,
    isOnline: networkState.isConnected && networkState.isInternetReachable !== false,
    isOffline: !networkState.isConnected || networkState.isInternetReachable === false,
    checkNetwork,
  };
}
