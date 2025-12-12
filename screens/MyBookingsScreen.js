// screens/MyBookingsScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import axios from 'axios';

const MyBookingsScreen = () => {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await axios.get('http://192.168.100.13:5000/api/bookings'); // replace with your API endpoint
        setBookings(response.data);
      } catch (error) {
        console.log(error);
      }
    };
    fetchBookings();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Bookings</Text>

      {bookings.length === 0 ? (
        <Text style={styles.noBooking}>You have no bookings yet.</Text>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.playTitle}>{item.playTitle}</Text>
              <Text>Date: {new Date(item.date).toDateString()}</Text>
              <Text>Seats: {item.seats}</Text>
              <Text>Status: {item.status}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#f8f8f8' 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 15, 
    textAlign: 'center', 
    color: '#6200EE' 
  },
  noBooking: { 
    textAlign: 'center', 
    marginTop: 20, 
    fontSize: 16, 
    color: '#555' 
  },
  card: { 
    backgroundColor: '#fff', 
    padding: 12, 
    borderRadius: 10, 
    marginBottom: 10, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowOffset: { width:0, height:2 }, 
    shadowRadius:4, 
    elevation:3 
  },
  playTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 5 
  },
});

export default MyBookingsScreen;
