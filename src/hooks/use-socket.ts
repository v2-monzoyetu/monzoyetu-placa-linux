// hooks/useSocket.ts
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export default function useSocket(url: string) {
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const socket = io(url, {
        autoConnect: true, // importante!
        transports: ['websocket'],
        });

        socketRef.current = socket;

        socket.on('connect', () => {
        setConnected(true);
        console.log('🔌 Socket conectado');
        });

        socket.on('disconnect', () => {
        setConnected(false);
        console.log('❌ Socket desconectado');
        });

        return () => {
        socket.disconnect();
        };
    }, [url]);

    return {
        socket: socketRef.current,
        connected,
    };
}
