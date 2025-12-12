import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

export default function PlayManagerHomeScreen({ navigation }) {
  return (
    <View style={styles.container}>

      <Text style={styles.title}>Play Manager Dashboard</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("CreatePlay")}
      >
        <Icon name="add-circle-outline" size={22} color="#fff" />
        <Text style={styles.buttonText}>Create New Play</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("ManagePlays")}
      >
        <Icon name="albums-outline" size={22} color="#fff" />
        <Text style={styles.buttonText}>Manage Existing Plays</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("BookingsForMyPlays")}
      >
        <Icon name="receipt-outline" size={22} color="#fff" />
        <Text style={styles.buttonText}>View Bookings</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#ff4444" }]}
        onPress={() => navigation.replace("Login")}
      >
        <Icon name="log-out-outline" size={22} color="#fff" />
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 30,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#222",
    marginBottom: 15,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    marginLeft: 10,
  },
});
