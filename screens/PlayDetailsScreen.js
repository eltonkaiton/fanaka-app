// screens/PlayDetailsScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';

const PlayDetailsScreen = ({ route, navigation }) => {
  const { playId } = route.params;
  const [play, setPlay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Update this with your actual server IP
  const API_BASE_URL = 'http://192.168.100.13:5000';

  useEffect(() => {
    const fetchPlay = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/plays/${playId}`);
        setPlay(response.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching play details:', error);
        setError('Failed to load play details');
      } finally {
        setLoading(false);
      }
    };
    fetchPlay();
  }, [playId]);

  const handleBookTicket = async () => {
    try {
      // You can implement actual booking API call here
      Alert.alert('Ticket Booking', 'Ticket booked successfully!');
      // Example API call:
      // await axios.post(`${API_BASE_URL}/api/bookings`, {
      //   playId: playId,
      //   userId: 'user_id_here',
      //   date: new Date().toISOString()
      // });
    } catch (error) {
      Alert.alert('Error', 'Failed to book ticket');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading play details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Retry" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  if (!play) {
    return (
      <View style={styles.centered}>
        <Text>No play data available</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  // Construct full image URL
  const imageUrl = play.image
    ? `${API_BASE_URL}${play.image}`
    : null;

  return (
    <ScrollView style={styles.container}>
      {/* Image Section */}
      {imageUrl ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      ) : (
        <View style={[styles.imageContainer, styles.noImage]}>
          <Text style={styles.noImageText}>No Image Available</Text>
        </View>
      )}

      {/* Play Details Section */}
      <View style={styles.detailsContainer}>
        <Text style={styles.title}>{play.title}</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.label}>Date & Time:</Text>
          <Text style={styles.value}>{formatDate(play.date)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.label}>Venue:</Text>
          <Text style={styles.value}>{play.venue || 'Not specified'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.label}>Price:</Text>
          <Text style={[styles.value, styles.price]}>
            KES {play.price || '0'}
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{play.description}</Text>
        </View>

        {/* Actors Section */}
        {play.actors && play.actors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cast</Text>
            {play.actors.map((actor, index) => (
              <View key={index} style={styles.actorItem}>
                <Text style={styles.actorName}>{actor.name || 'Actor'}</Text>
                {actor.role && <Text style={styles.actorRole}>as {actor.role}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Additional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Created</Text>
              <Text style={styles.infoValue}>
                {new Date(play.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={[styles.infoValue, styles.statusActive]}>
                {new Date(play.date) > new Date() ? 'Upcoming' : 'Past Event'}
              </Text>
            </View>
          </View>
        </View>

        {/* Booking Button */}
        <View style={styles.bookingContainer}>
          <Button
            title="Book Ticket"
            onPress={handleBookTicket}
            color="#4CAF50"
            disabled={new Date(play.date) <= new Date()}
          />
          {new Date(play.date) <= new Date() && (
            <Text style={styles.bookingNote}>
              Booking unavailable for past events
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#e0e0e0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#666',
    fontSize: 16,
  },
  detailsContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    flex: 1,
  },
  value: {
    fontSize: 16,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  section: {
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    textAlign: 'justify',
  },
  actorItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actorRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  infoItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    minWidth: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusActive: {
    color: '#4CAF50',
  },
  bookingContainer: {
    marginTop: 30,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  bookingNote: {
    textAlign: 'center',
    color: '#f44336',
    marginTop: 10,
    fontSize: 14,
  },
});

export default PlayDetailsScreen;