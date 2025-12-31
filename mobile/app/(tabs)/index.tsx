import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Phone, X, Mic, MicOff, Volume2, Delete } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWebRTC } from '@/hooks/useWebRTC';

export default function DialPad() {
  const [number, setNumber] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const insets = useSafeAreaInsets();

  const {
    connect,
    makeCall,
    hangUp,
    localStream,
    remoteStream,
    connectionState,
    error,
  } = useWebRTC();

  const dialPadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  const handleNumberPress = (num: string) => {
    if (number.length < 15) { // Limit number length
      setNumber(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setNumber(prev => prev.slice(0, -1));
  };

  const handleLongPressBackspace = () => {
    setNumber('');
  };

  const handleCall = async () => {
    if (number.length > 0) {
      setIsInCall(true);
      await connect();
      await makeCall();
    }
  };

  const handleEndCall = () => {
    hangUp();
    setIsInCall(false);
    setNumber('');
    setIsMuted(false);
    setIsSpeaker(false);
    setCallDuration(0);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isInCall && connectionState === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isInCall, connectionState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPhoneNumber = (value: string) => {
    if (!value) return '';
    
    const numbers = value.replace(/\D/g, '');
    const char = { 0: '(', 3: ') ', 6: '-' };
    let formatted = '';
    
    for (let i = 0; i < numbers.length; i++) {
      formatted += (char[i] || '') + numbers[i];
    }
    return formatted;
  };

  useEffect(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Handle speaker mode for mobile devices
      if (localStream) {
        // Use native audio routing APIs
      }
    }
  }, [isSpeaker, localStream]);

  if (isInCall) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <BlurView intensity={80} style={styles.callContainer}>
          <View style={styles.callerInfo}>
            <Text style={styles.callerNumber}>{formatPhoneNumber(number)}</Text>
            <Text style={styles.callStatus}>
              {connectionState === 'connected' 
                ? formatDuration(callDuration)
                : connectionState}
            </Text>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
          
          <View style={styles.controls}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setIsMuted(!isMuted)}>
              {isMuted ? 
                <MicOff size={24} color="#fff" /> :
                <Mic size={24} color="#fff" />
              }
              <Text style={styles.controlText}>Mute</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setIsSpeaker(!isSpeaker)}>
              <Volume2 size={24} color={isSpeaker ? '#2ecc71' : '#fff'} />
              <Text style={styles.controlText}>Speaker</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.endCallButton}
            onPress={handleEndCall}>
            <X size={32} color="#fff" />
          </TouchableOpacity>
        </BlurView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.numberDisplay}>
        <Text style={styles.number}>{formatPhoneNumber(number)}</Text>
        {number.length > 0 && (
          <TouchableOpacity
            style={styles.backspaceButton}
            onPress={handleBackspace}
            onLongPress={handleLongPressBackspace}>
            <Delete size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.dialPad}>
        {dialPadNumbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map(num => (
              <TouchableOpacity
                key={num}
                style={styles.dialButton}
                onPress={() => handleNumberPress(num)}>
                <Text style={styles.dialButtonText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {number.length > 0 && (
        <TouchableOpacity 
          style={styles.callButton}
          onPress={handleCall}>
          <Phone size={32} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  numberDisplay: {
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  number: {
    fontSize: 36,
    color: '#fff',
    letterSpacing: 2,
    textAlign: 'center',
  },
  backspaceButton: {
    marginLeft: 15,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  dialPad: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  dialButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialButtonText: {
    fontSize: 32,
    color: '#fff',
  },
  callButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2ecc71',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
  },
  callContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  callerInfo: {
    alignItems: 'center',
    marginTop: 60,
  },
  callerNumber: {
    fontSize: 32,
    color: '#fff',
    marginBottom: 10,
  },
  callStatus: {
    fontSize: 16,
    color: '#999',
  },
  errorText: {
    color: '#e74c3c',
    marginTop: 10,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
  },
  controlButton: {
    alignItems: 'center',
  },
  controlText: {
    color: '#fff',
    marginTop: 8,
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 40,
  },
});