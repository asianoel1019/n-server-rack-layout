import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebSocket() {
  const wsRef = useRef(null);
  const [deviceStatus, setDeviceStatus] = useState({});
  const [connected, setConnected] = useState(false);
  const reconnectRef = useRef(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      reconnectRef.current = setTimeout(connect, 5000);
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'status_update') setDeviceStatus(msg.data || {});
      } catch (err) { /* ignore */ }
    };
    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { deviceStatus, connected };
}
