import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "expense_tracker_device_id_v1";

function generateDeviceId() {
  // No external deps: good enough for partitioning per-device data.
  return `dev_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function useDeviceId() {
  const [deviceId, setDeviceId] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
        if (existing) {
          if (mounted) setDeviceId(existing);
          return;
        }
        const next = generateDeviceId();
        await AsyncStorage.setItem(DEVICE_ID_KEY, next);
        if (mounted) setDeviceId(next);
      } catch (e) {
        console.error(e);
        // Fall back to an in-memory id (still lets app run).
        if (mounted) setDeviceId(generateDeviceId());
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return deviceId;
}
