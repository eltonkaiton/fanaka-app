import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, Alert, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import axios from 'axios';

export default function AssignActorsScreen({ route, navigation }) {
  const { playId, playTitle } = route.params;
  const [actors, setActors] = useState([]);
  const [selectedActors, setSelectedActors] = useState([]);
  const [actorRoles, setActorRoles] = useState({}); // key: actorId, value: role

  // Fetch all active actors
  const fetchActors = async () => {
    try {
      const response = await axios.get('http://192.168.100.164:5000/api/actors?status=Active');
      setActors(response.data);
    } catch (error) {
      console.log('Fetch Actors Error:', error?.response?.data || error);
      Alert.alert('Error', 'Failed to fetch actors.');
    }
  };

  useEffect(() => {
    fetchActors();
  }, []);

  const toggleSelectActor = (actorId) => {
    if (selectedActors.includes(actorId)) {
      setSelectedActors(selectedActors.filter(id => id !== actorId));
      const newRoles = { ...actorRoles };
      delete newRoles[actorId];
      setActorRoles(newRoles);
    } else {
      setSelectedActors([...selectedActors, actorId]);
    }
  };

  const handleAssignActors = async () => {
    if (selectedActors.length === 0) {
      Alert.alert('No Actors Selected', 'Please select at least one actor.');
      return;
    }

    // Prepare array of { actor, role }
    const actorsToAssign = selectedActors.map(actorId => ({
      actor: actorId,
      role: actorRoles[actorId] || 'Actor', // default role
    }));

    try {
      const API_URL = `http://192.168.100.164:5000/api/plays/${playId}/assign-actors`;
      const response = await axios.post(API_URL, { actors: actorsToAssign });

      if (response.status === 200) {
        Alert.alert('Success', 'Actors assigned successfully!');
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to assign actors.');
      }
    } catch (error) {
      console.log('Assign Actors Error:', error?.response?.data || error.message);
      Alert.alert('Error', 'An error occurred. Please try again.');
    }
  };

  const renderActor = ({ item }) => (
    <TouchableOpacity
      style={[styles.actorCard, selectedActors.includes(item._id) && styles.selectedActor]}
      onPress={() => toggleSelectActor(item._id)}
    >
      <Text style={styles.actorName}>{item.fullName} ({item.stageName || 'No Stage Name'})</Text>
      <Text>Email: {item.email}</Text>
      <Text>Phone: {item.phone}</Text>
      <Text>Status: {item.status}</Text>
      {selectedActors.includes(item._id) && (
        <TextInput
          style={styles.roleInput}
          placeholder="Role in this play"
          value={actorRoles[item._id] || ''}
          onChangeText={text => setActorRoles({ ...actorRoles, [item._id]: text })}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Assign Actors to "{playTitle}"</Text>
      <FlatList
        data={actors}
        keyExtractor={item => item._id}
        renderItem={renderActor}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No active actors available.</Text>}
      />
      <View style={{ marginTop: 20 }}>
        <Button title="Assign Selected Actors" onPress={handleAssignActors} color="#28a745" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  actorCard: { padding: 15, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 10, backgroundColor: '#fff' },
  selectedActor: { backgroundColor: '#cce5ff', borderColor: '#3399ff' },
  actorName: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  roleInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginTop: 10, backgroundColor: '#fff' },
});
