import { useEffect, useRef, useState } from 'react';

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

export function useWebRTC() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>('new');
  const [error, setError] = useState<string | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const ws = useRef<WebSocket | null>(null);

  const connect = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      peerConnection.current = new RTCPeerConnection(configuration);
      
      stream.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, stream);
      });

      peerConnection.current.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          ws.current?.send(JSON.stringify({
            type: 'ice-candidate',
            payload: event.candidate,
          }));
        }
      };

      peerConnection.current.onconnectionstatechange = () => {
        setConnectionState(peerConnection.current?.connectionState || 'new');
      };

      ws.current = new WebSocket(window.location.origin.replace(/^http/, 'ws') + '/call');
      
      ws.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'offer':
            await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data.payload));
            const answer = await peerConnection.current?.createAnswer();
            await peerConnection.current?.setLocalDescription(answer);
            ws.current?.send(JSON.stringify({
              type: 'answer',
              payload: answer,
              target: data.from,
            }));
            break;
            
          case 'answer':
            await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data.payload));
            break;
            
          case 'ice-candidate':
            await peerConnection.current?.addIceCandidate(new RTCIceCandidate(data.payload));
            break;
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to establish connection');
    }
  };

  const makeCall = async () => {
    try {
      const offer = await peerConnection.current?.createOffer();
      await peerConnection.current?.setLocalDescription(offer);
      
      ws.current?.send(JSON.stringify({
        type: 'offer',
        payload: offer,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make call');
    }
  };

  const hangUp = () => {
    localStream?.getTracks().forEach(track => track.stop());
    peerConnection.current?.close();
    ws.current?.close();
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('closed');
  };

  useEffect(() => {
    return () => {
      hangUp();
    };
  }, []);

  return {
    connect,
    makeCall,
    hangUp,
    localStream,
    remoteStream,
    connectionState,
    error,
  };
}