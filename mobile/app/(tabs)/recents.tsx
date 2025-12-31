import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CallType = 'incoming' | 'outgoing' | 'missed';

interface CallRecord {
  id: string;
  number: string;
  type: CallType;
  timestamp: string;
  duration?: string;
}

const mockCalls: CallRecord[] = [
  {
    id: '1',
    number: '+1 (555) 123-4567',
    type: 'incoming',
    timestamp: '10:30 AM',
    duration: '5:23',
  },
  {
    id: '2',
    number: '+1 (555) 987-6543',
    type: 'outgoing',
    timestamp: 'Yesterday',
    duration: '2:45',
  },
  {
    id: '3',
    number: '+1 (555) 456-7890',
    type: 'missed',
    timestamp: 'Yesterday',
  },
];

export default function Recents() {
  const insets = useSafeAreaInsets();

  const getCallIcon = (type: CallType) => {
    switch (type) {
      case 'incoming':
        return <PhoneIncoming size={20} color="#2ecc71" />;
      case 'outgoing':
        return <PhoneOutgoing size={20} color="#3498db" />;
      case 'missed':
        return <PhoneMissed size={20} color="#e74c3c" />;
    }
  };

  const renderItem = ({ item }: { item: CallRecord }) => (
    <TouchableOpacity style={styles.callItem}>
      <View style={styles.callInfo}>
        {getCallIcon(item.type)}
        <View style={styles.numberContainer}>
          <Text style={styles.number}>{item.number}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.callButton}>
        <Phone size={20} color="#2ecc71" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Recent Calls</Text>
      <FlatList
        data={mockCalls}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#fff',
    padding: 20,
  },
  list: {
    padding: 20,
  },
  callItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  callInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberContainer: {
    marginLeft: 15,
  },
  number: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
});