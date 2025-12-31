import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Phone, Search, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Contact {
  id: string;
  name: string;
  number: string;
}

const mockContacts: Contact[] = [
  { id: '1', name: 'Alice Johnson', number: '+1 (555) 123-4567' },
  { id: '2', name: 'Bob Smith', number: '+1 (555) 987-6543' },
  { id: '3', name: 'Carol Williams', number: '+1 (555) 456-7890' },
  { id: '4', name: 'David Brown', number: '+1 (555) 234-5678' },
  { id: '5', name: 'Eve Davis', number: '+1 (555) 876-5432' },
];

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();

  const filteredContacts = mockContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.number.includes(searchQuery)
  );

  const renderItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity style={styles.contactItem}>
      <View style={styles.contactInfo}>
        <View style={styles.avatar}>
          <User size={24} color="#fff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.number}>{item.number}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.callButton}>
        <Phone size={20} color="#2ecc71" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Contacts</Text>
      
      <View style={styles.searchContainer}>
        <Search size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts"
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredContacts}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    margin: 20,
    borderRadius: 10,
    padding: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    padding: 0,
  },
  list: {
    padding: 20,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 15,
  },
  name: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  number: {
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