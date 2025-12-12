import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  Image,
  TextInput,
  Alert
} from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';

const HomeScreen = ({ navigation }) => {
  const [plays, setPlays] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchPlays = async () => {
      try {
        const response = await axios.get('http://192.168.100.13:5000/api/plays');
        setPlays(response.data);
      } catch (error) {
        console.log(error);
        Alert.alert('Error', 'Failed to fetch plays');
      }
    };
    fetchPlays();
  }, []);

  const filteredPlays = plays.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        <Text style={styles.header}>Fanaka Arts</Text>
        <Text style={styles.subtitle}>Upcoming Plays</Text>

        {/* Search Bar */}
        <TextInput
          style={styles.search}
          placeholder="Search plays..."
          value={search}
          onChangeText={setSearch}
        />

        <FlatList
          data={filteredPlays}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity  
              style={styles.card}
              onPress={() => navigation.navigate('PlayDetails', { playId: item._id })}
            >
              <Image
                source={{ uri: item.image || "https://via.placeholder.com/150" }}
                style={styles.image}
              />
              <View style={styles.cardContent}>
                <Text style={styles.playTitle}>{item.title}</Text>
                <Text style={styles.date}>{new Date(item.date).toDateString()}</Text>
                <Text numberOfLines={2} style={styles.description}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#f8f8f8" },
  container: { flex: 1, padding: 20 },

  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#6200EE",
    marginBottom: 5,
    textAlign: "center"
  },

  subtitle: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 20,
    color: "#555"
  },

  search: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 15,
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 4,
  },

  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: "#ddd",
  },

  cardContent: {
    flex: 1,
    justifyContent: "center",
  },

  playTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333"
  },

  date: {
    color: "#6200EE",
    fontWeight: "bold",
    marginTop: 3,
  },

  description: {
    color: "#555",
    marginTop: 5,
  }
});

export default HomeScreen;
