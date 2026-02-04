// screens/UsherScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function UsherScreen({ navigation }) {
  const [bookingRef, setBookingRef] = useState('');
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [todayBookings, setTodayBookings] = useState([]);

  // Fetch today's confirmed bookings
  useEffect(() => {
    fetchTodayBookings();
  }, []);

  const fetchTodayBookings = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      
      const response = await axios.get(
        `http://192.168.0.103/api/bookings?date=${today}&status=confirmed`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setTodayBookings(response.data.bookings);
      }
    } catch (error) {
      console.error('Error fetching today bookings:', error);
    }
  };

  const verifyBooking = async () => {
    if (!bookingRef.trim()) {
      Alert.alert('Error', 'Please enter booking reference');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        `http://192.168.0.103/api/bookings/verify/${bookingRef}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setBookingData(response.data.booking);
        setScanned(false);
      } else {
        Alert.alert('Not Found', 'Booking reference not found');
        setBookingData(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify booking');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const checkInCustomer = async () => {
    if (!bookingData) return;

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.put(
        `http://192.168.0.103/api/bookings/${bookingData.id}/checkin`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        Alert.alert('Success', 'Customer checked in successfully!');
        setBookingData({ ...bookingData, checkedIn: true });
        fetchTodayBookings(); // Refresh list
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check in');
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleScanQR = () => {
    // For QR code scanning (you can integrate react-native-camera or react-native-vision-camera)
    Alert.alert('QR Scan', 'QR scanning would be implemented here');
    // After scan, setBookingRef(scannedData)
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Ticket Verification</Text>
          <Text style={styles.subtitle}>Verify and check-in customers</Text>
        </View>

        {/* Search Section */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.input}
              placeholder="Enter Booking Reference"
              value={bookingRef}
              onChangeText={setBookingRef}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.scanButton} onPress={handleScanQR}>
              <Icon name="qr-code-outline" size={24} color="#6200EE" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.verifyButton} 
            onPress={verifyBooking}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.verifyButtonText}>Verify Ticket</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Booking Details */}
        {bookingData && (
          <View style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <Text style={styles.bookingRef}>{bookingData.bookingReference}</Text>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: bookingData.checkedIn ? '#4CAF50' : '#FF9800' }
              ]}>
                <Text style={styles.statusText}>
                  {bookingData.checkedIn ? 'CHECKED IN' : 'NOT CHECKED IN'}
                </Text>
              </View>
            </View>

            <Text style={styles.playTitle}>{bookingData.playTitle}</Text>
            <Text style={styles.customerName}>{bookingData.customerName}</Text>
            
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Icon name="time-outline" size={16} color="#666" />
                <Text style={styles.detailText}>{formatTime(bookingData.playDate)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Icon name="people-outline" size={16} color="#666" />
                <Text style={styles.detailText}>{bookingData.quantity} persons</Text>
              </View>
            </View>

            {/* Seat Assignment */}
            {bookingData.allocatedSeats && bookingData.allocatedSeats.length > 0 && (
              <View style={styles.seatsSection}>
                <Text style={styles.sectionLabel}>Assigned Seats</Text>
                <View style={styles.seatsContainer}>
                  {bookingData.allocatedSeats.map((seat, index) => (
                    <View key={index} style={styles.seatChip}>
                      <Text style={styles.seatText}>{seat.number}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            {!bookingData.checkedIn ? (
              <TouchableOpacity 
                style={styles.checkInButton} 
                onPress={checkInCustomer}
              >
                <Icon name="enter-outline" size={20} color="#fff" />
                <Text style={styles.checkInText}>Check In Customer</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.checkedInContainer}>
                <Icon name="checkmark-done-circle" size={30} color="#4CAF50" />
                <Text style={styles.checkedInText}>Checked In at {new Date().toLocaleTimeString()}</Text>
              </View>
            )}
          </View>
        )}

        {/* Today's Expected Customers */}
        <View style={styles.todaySection}>
          <Text style={styles.sectionTitle}>Today's Expected ({todayBookings.length})</Text>
          <ScrollView style={styles.todayList} showsVerticalScrollIndicator={false}>
            {todayBookings.map((booking) => (
              <TouchableOpacity 
                key={booking.id} 
                style={styles.todayItem}
                onPress={() => {
                  setBookingRef(booking.bookingReference);
                  verifyBooking();
                }}
              >
                <View style={styles.todayItemLeft}>
                  <Text style={styles.todayRef}>{booking.bookingReference}</Text>
                  <Text style={styles.todayCustomer}>{booking.customerName}</Text>
                </View>
                <View style={styles.todayItemRight}>
                  <Text style={styles.todayTime}>{formatTime(booking.playDate)}</Text>
                  <View style={[
                    styles.todayStatus,
                    { backgroundColor: booking.checkedIn ? '#4CAF50' : '#FF9800' }
                  ]}>
                    <Text style={styles.todayStatusText}>
                      {booking.checkedIn ? 'In' : 'Out'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            {todayBookings.length === 0 && (
              <Text style={styles.emptyText}>No bookings for today</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 10,
  },
  scanButton: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  verifyButton: {
    flexDirection: 'row',
    backgroundColor: '#6200EE',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingRef: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  playTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  detailText: {
    marginLeft: 6,
    color: '#666',
  },
  seatsSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  seatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  seatChip: {
    backgroundColor: '#6200EE',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  seatText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  checkInButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  checkedInContainer: {
    alignItems: 'center',
    padding: 10,
  },
  checkedInText: {
    marginTop: 8,
    color: '#4CAF50',
    fontWeight: '600',
  },
  todaySection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  todayList: {
    flex: 1,
  },
  todayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  todayItemLeft: {
    flex: 1,
  },
  todayRef: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  todayCustomer: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  todayItemRight: {
    alignItems: 'flex-end',
  },
  todayTime: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  todayStatus: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  todayStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 20,
  },
});