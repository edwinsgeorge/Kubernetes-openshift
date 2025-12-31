import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'; 
import { Mic, Square } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';

interface Message {
  type: 'transcript' | 'ai-response' | 'error' | 'stt-error';
  content: string;
  timestamp: Date;
}

// Define possible connection statuses
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export default function ChatScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected'); // State for WS status

  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  // Generate sessionId only once using useRef
  const sessionIdRef = useRef(Math.random().toString(36).substring(7));

  // Effect for establishing and cleaning up WebSocket connection
  useEffect(() => {
    // Function to establish connection (can be called manually if needed for reconnect)
    const connect = () => {
      // Prevent multiple connections
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
         console.log('WebSocket connection already exists or is connecting.');
         return;
      }

      setConnectionStatus('connecting');
      setError(null); // Clear previous errors on new attempt
      console.log(`Attempting to connect WebSocket with session ID: ${sessionIdRef.current}`);

      // Use the persistent session ID
      const wsUrl = `ws://192.168.31.30:8000/ws/call/${sessionIdRef.current}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected to', wsUrl);
        setConnectionStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data.type); // Log type
    
          let textMessageToAdd: Message | null = null; // For adding text to UI
    
          // --- Handle Errors ---
          if (data.type === 'error' || data.type === 'stt-error') {
             const errorMessage = data.message || 'An unspecified error occurred.';
             setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
             console.error(`Received error from server: ${errorMessage}`);
          }
          // --- Handle Transcript ---
          else if (data.type === 'transcript') {
            textMessageToAdd = { type: 'transcript', content: data.payload ?? '', timestamp: new Date() };
          }
          // --- Handle AI Text Response (used as fallback or if TTS fails) ---
          else if (data.type === 'ai-response') {
             textMessageToAdd = { type: 'ai-response', content: data.payload?.response ?? '', timestamp: new Date() };
          }
           // --- Handle Routing Info ---
           // --- Handle AI Audio Response (Primary Success Case) ---
          else if (data.type === 'ai_audio_response') {
              const { text_content, audio_base64, language_code } = data.payload;
    
              // 1. Add the text part to the chat UI
              if (text_content) {
                  textMessageToAdd = { type: 'ai-response', content: text_content, timestamp: new Date() };
              }
    
              // 2. Play the audio
              if (audio_base64) {
                  console.log(`Received audio data (Base64 length: ${audio_base64.length}), Lang: ${language_code}. Preparing playback...`);
                  // Wrap playback in an async function
                  const playAudio = async () => {
                     try {
                         await Audio.setAudioModeAsync({ // Ensure playback is possible
                           allowsRecordingIOS: false, // Important: Set to false if not recording
                           playsInSilentModeIOS: true,
                         });
                         console.log('Audio mode set for playback.');
                         // Use 'data:audio/wav;base64,' prefix for base64 data URI
                         const { sound } = await Audio.Sound.createAsync(
                            { uri: 'data:audio/wav;base64,' + audio_base64 },
                            { shouldPlay: true } // Play immediately
                         );
                         console.log('Playing sound...');
                         // Optional: Unload sound after playback finishes to free resources
                         sound.setOnPlaybackStatusUpdate(async (status) => {
                           if (status.isLoaded && status.didJustFinish) {
                             console.log('Playback finished, unloading sound.');
                             await sound.unloadAsync();
                             // Reset audio mode if needed (e.g., if you need recording again soon)
                            //  await Audio.setAudioModeAsync({ allowsRecordingIOS: true });
                           } else if (status.isLoaded && status.error) {
                                console.error(`Playback Error: ${status.error}`);
                                setError('Failed to play AI audio response.');
                           }
                         });
                     } catch (e: any) {
                         console.error('Error playing audio:', e);
                         setError(`Failed to play audio: ${e.message}`);
                         // Potentially reset audio mode on error too
                         // await Audio.setAudioModeAsync({ allowsRecordingIOS: true });
                     }
                  };
                  playAudio(); // Fire off the audio playback
              } else {
                   console.warn("ai_audio_response received but no audio_base64 data found.");
              }
          }
          // --- Handle Unknown Types ---
          else {
             console.warn('Received unknown message type:', data.type);
          }
    
          // Add the text message to the list if it was created
          if (textMessageToAdd) {
            if (typeof textMessageToAdd.content !== 'string') {
               textMessageToAdd.content = String(textMessageToAdd.content);
            }
             setMessages((prev) => [...prev, textMessageToAdd!]);
             scrollViewRef.current?.scrollToEnd({ animated: true });
          }
    
        } catch (e) {
          console.error('Error parsing WebSocket message:', e, 'Raw data:', event.data);
          setError('Received invalid message from server.');
        }
      };
      ws.onerror = (errorEvent) => {
        console.error('WebSocket error:', errorEvent);
        setError('WebSocket connection error. Please try again later.');
        setConnectionStatus('error');
        wsRef.current = null; // Clear ref on error
      };

      ws.onclose = (closeEvent) => {
        console.log('WebSocket closed:', closeEvent.code, closeEvent.reason);
        // Only set to disconnected if it wasn't already an error or connecting
        if (connectionStatus !== 'error' && connectionStatus !== 'connecting') {
           setConnectionStatus('disconnected');
           // Optionally show a message if the close was unexpected
           if (!closeEvent.wasClean) {
             setError('Connection lost unexpectedly.');
           }
        }
         wsRef.current = null; // Clear ref on close
      };

      wsRef.current = ws;
    };

    // Establish connection on mount
    connect();

    // Cleanup on unmount
    return () => {
      console.log('ChatScreen unmounting: Closing WebSocket.');
      // Use code 1000 for normal closure
      wsRef.current?.close(1000, 'Component unmounting');
      wsRef.current = null;
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  /**
   * Start recording using a WAV format
   */
  const startRecording = async () => {
    // Check WebSocket connection status BEFORE starting recording
    if (connectionStatus !== 'connected' || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
       setError(`Cannot record: WebSocket is not connected (Status: ${connectionStatus}).`);
       console.error('Attempted to record but WebSocket is not open. Status:', connectionStatus, 'ReadyState:', wsRef.current?.readyState);
       // Optional: You could try to reconnect here by calling `connect()`
       // connect();
       return;
     }

    setError(null); // Clear previous errors when starting a new recording

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone permission not granted');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Stop and unload any previous recording instance
      if (recordingRef.current) {
         console.log("Unloading previous recording instance before starting new one.");
         await recordingRef.current.stopAndUnloadAsync();
         recordingRef.current = null;
      }


      const recording = new Audio.Recording();
      console.log('Preparing to record...');
      await recording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: { // Keep web config for potential future use or Expo Go compatibility
            mimeType: 'audio/wav',
            bitsPerSecond: 128000,
        },
      });

      recordingRef.current = recording;
      await recording.startAsync();
      console.log('Recording started');
      setIsRecording(true);

      // DO NOT connect WebSocket here anymore
      // connectWebSocket();

    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setError(`Failed to start recording: ${err.message || 'Unknown error'}`);
       setIsRecording(false); // Ensure state is reset
       recordingRef.current = null; // Clear recording ref on error
    }
  };

  /**
   * Stop recording & send the audio data over WebSocket
   */
  const stopRecording = async () => {
    console.log('Stopping recording...');
    setIsRecording(false); // Update UI immediately

    if (!recordingRef.current) {
       console.warn('stopRecording called but no recordingRef found.');
       return;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      console.log('Recording stopped and unloaded. File URI:', uri);

      recordingRef.current = null; // Clear the ref after stopping

      if (!uri) {
        setError('Failed to get recording URI.');
        return;
      }

       // Check WebSocket state *before* sending
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Convert local file URI -> Blob
        console.log('Fetching recorded audio blob...');
        const response = await fetch(uri);
        const blob = await response.blob();
        console.log(`Workspaceed blob successfully (Size: ${blob.size}, Type: ${blob.type}). Sending over WebSocket...`);

        // Send the entire blob as a WS binary frame
        wsRef.current.send(blob);
        console.log('Sent WAV blob over WebSocket');
      } else {
        console.error('WebSocket is not open. Cannot send audio. State:', wsRef.current?.readyState);
        setError('Connection lost. Could not send audio.');
        // Optionally try to reconnect here if desired
        // connect();
      }

      // DO NOT close the WebSocket connection here
      // wsRef.current?.close();

    } catch (err: any) {
      console.error('Failed to stop recording or send data:', err);
      setError(`Failed to stop recording: ${err.message || 'Unknown error'}`);
       // Ensure recordingRef is cleared even if stopAndUnloadAsync fails partially
       recordingRef.current = null;
    }
  };

  // Helper to display connection status
  const renderConnectionStatus = () => {
     switch (connectionStatus) {
        case 'connecting':
           return <View style={styles.statusContainer}><ActivityIndicator size="small" color="#aaa" /><Text style={styles.statusText}> Connecting...</Text></View>;
        case 'connected':
           return <View style={styles.statusContainer}><View style={styles.connectedDot} /><Text style={styles.statusText}> Connected</Text></View>;
        case 'error':
            return <View style={styles.statusContainer}><View style={[styles.connectedDot, styles.errorDot]} /><Text style={styles.statusText}> Connection Error</Text></View>;
        case 'disconnected':
           return <View style={styles.statusContainer}><View style={[styles.connectedDot, styles.disconnectedDot]} /><Text style={styles.statusText}> Disconnected</Text></View>;
        default:
           return null;
     }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
          <Text style={styles.title}>AI Voice Chat</Text>
          {renderConnectionStatus()}
      </View>


      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          {/* Optional: Add a button to dismiss error or retry connection */}
          {/* <TouchableOpacity onPress={() => setError(null)}> <Text>Dismiss</Text> </TouchableOpacity> */}
          {/* {(connectionStatus === 'error' || connectionStatus === 'disconnected') &&
             <TouchableOpacity onPress={connect}> <Text>Retry Connection</Text> </TouchableOpacity>
          } */}
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageBox,
              message.type === 'transcript'
                ? styles.userMessage
                : styles.aiMessage,
            ]}
          >
            <Text style={styles.messageText}>{message.content}</Text>
            <Text style={styles.timestamp}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
             styles.recordButton,
             isRecording && styles.recordingButton,
             // Disable button slightly if not connected
             connectionStatus !== 'connected' && styles.disabledButton
            ]}
          // Disable onPress if not connected or already recording/stopping
          disabled={connectionStatus !== 'connected' || (isRecording && recordingRef.current === null) /* Prevent spamming stop */}
          onPress={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? (
            <Square size={28} color="#fff" />
          ) : (
             // Show ActivityIndicator if connecting
            connectionStatus === 'connecting' ?
               <ActivityIndicator size="large" color="#fff" /> :
               <Mic size={28} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Add styles for status indicators and disabled button
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { // Flexbox for title and status
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 10, // Adjust as needed
  },
  title: { fontSize: 34, fontWeight: 'bold', color: '#fff' },
  statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 5,
      borderRadius: 5,
      backgroundColor: '#33333399' // Semi-transparent background
  },
  statusText: {
     color: '#ccc',
     fontSize: 12,
     marginLeft: 5,
  },
  connectedDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#2ecc71', // Green for connected
  },
  errorDot: {
    backgroundColor: '#e74c3c', // Red for error
  },
  disconnectedDot: {
      backgroundColor: '#aaa', // Gray for disconnected
  },
  errorContainer: {
    backgroundColor: '#ff000033',
    padding: 10,
    marginHorizontal: 20,
    marginTop: 10, // Add some margin top
    marginBottom: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff000088'
  },
  errorText: { color: '#ffaaaa', textAlign: 'center', fontWeight: 'bold' },
  messagesContainer: { flex: 1, paddingHorizontal: 20 }, // Only horizontal padding needed
  messagesContent: { paddingBottom: 20, paddingTop: 10 }, // Add padding top
  messageBox: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    maxWidth: '85%', // Allow slightly wider messages
  },
  userMessage: {
    backgroundColor: '#2ecc71',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 5,
  },
  aiMessage: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 5,
  },
  messageText: { color: '#fff', fontSize: 16 },
  timestamp: {
    color: '#ffffffaa', // Slightly more visible timestamp
    fontSize: 10, // Smaller timestamp
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  controls: { padding: 20, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#333' }, // Add separator
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2ecc71', // Green for ready
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000", // Add shadow for depth
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordingButton: {
     backgroundColor: '#e74c3c', // Red for recording
  },
  disabledButton: {
      backgroundColor: '#95a5a6', // Gray when disabled
      opacity: 0.7,
  },
});