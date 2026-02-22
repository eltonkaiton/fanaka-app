// screens/UsherScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function UsherScreen({ navigation }) {
  const [bookingRef, setBookingRef] = useState('');
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [todayBookings, setTodayBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusBookings, setStatusBookings] = useState([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [showBookingDetails, setShowBookingDetails] = useState(false);

  useEffect(() => {
    fetchTodayBookings();
    fetchAllBookings();
  }, []);

  useEffect(() => {
    filterBookingsByStatus();
  }, [selectedStatus, todayBookings, allBookings, showAllBookings]);

  const fetchTodayBookings = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(`https://fanaka-server-1.onrender.com/api/bookings?date=${today}&status=confirmed`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) setTodayBookings(response.data.bookings);
    } catch (error) {
      console.error('Error fetching today bookings:', error);
      Alert.alert('Error', 'Failed to load today\'s bookings');
    }
  };

  const fetchAllBookings = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get('https://fanaka-server-1.onrender.com/api/bookings', { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) setAllBookings(response.data.bookings);
    } catch (error) {
      console.error('Error fetching all bookings:', error);
    }
  };

  const filterBookingsByStatus = () => {
    const bookings = showAllBookings ? allBookings : todayBookings;
    if (selectedStatus === 'all') {
      setFilteredBookings(bookings);
    } else if (selectedStatus === 'checkedIn') {
      setFilteredBookings(bookings.filter(booking => booking.checkedIn));
    } else if (selectedStatus === 'notCheckedIn') {
      setFilteredBookings(bookings.filter(booking => !booking.checkedIn && booking.status === 'confirmed'));
    } else {
      setFilteredBookings(bookings.filter(booking => booking.status === selectedStatus));
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
      const response = await axios.get(`https://fanaka-server-1.onrender.com/api/bookings/verify/${bookingRef}`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) {
        setBookingData(response.data.booking);
        setShowBookingDetails(true);
      } else {
        Alert.alert('Not Found', 'Booking reference not found');
        setBookingData(null);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.msg || 'Failed to verify booking');
    } finally {
      setLoading(false);
    }
  };

  const checkInCustomer = async () => {
    if (!bookingData) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.put(`https://fanaka-server-1.onrender.com/api/bookings/${bookingData.id}/checkin`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) {
        Alert.alert('Success', 'Customer checked in successfully!', [
          { text: 'OK', onPress: () => {
            setBookingData({ ...bookingData, checkedIn: true, checkInTime: new Date() });
            fetchTodayBookings();
            fetchAllBookings();
            // Clear form after successful check-in
            setTimeout(() => {
              setBookingRef('');
              setBookingData(null);
              setShowBookingDetails(false);
            }, 1500);
          }}
        ]);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.msg || 'Failed to check in');
    }
  };

  const handleBack = () => {
    setShowBookingDetails(false);
    setBookingData(null);
    setBookingRef('');
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        try {
          await AsyncStorage.clear();
          Alert.alert('Logged Out', 'You have been logged out successfully');
          navigation.replace('Login');
        } catch (error) {
          Alert.alert('Error', 'Failed to logout');
        }
      }}
    ]);
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'confirmed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'cancelled': return '#F44336';
      case 'checked_in': return '#2196F3';
      default: return '#757575';
    }
  };

  const getStatusText = (status) => {
    switch(status?.toLowerCase()) {
      case 'confirmed': return 'Confirmed';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      case 'checked_in': return 'Checked In';
      default: return status || 'Unknown';
    }
  };

  const handleScanQR = () => {
    Alert.alert('QR Scan', 'QR scanning would be implemented here');
  };

  const showStatusBookings = (status) => {
    const bookings = showAllBookings ? allBookings : todayBookings;
    let filtered = [];
    
    if (status === 'checkedIn') {
      filtered = bookings.filter(booking => booking.checkedIn);
      setSelectedStatusFilter('Checked In');
    } else if (status === 'notCheckedIn') {
      filtered = bookings.filter(booking => !booking.checkedIn && booking.status === 'confirmed');
      setSelectedStatusFilter('Not Checked In');
    } else {
      filtered = bookings.filter(booking => booking.status === status);
      setSelectedStatusFilter(getStatusText(status));
    }
    
    setStatusBookings(filtered);
    setStatusModalVisible(true);
  };

  const StatusSidebar = () => (
    <View style={styles.sidebar}>
      <TouchableOpacity style={styles.sidebarCloseButton} onPress={() => setSidebarVisible(false)}>
        <Icon name="close" size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.sidebarTitle}>Filter by Status</Text>
      <TouchableOpacity style={[styles.sidebarItem, selectedStatus === 'all' && styles.sidebarItemActive]} onPress={() => { setSelectedStatus('all'); setSidebarVisible(false); }}>
        <Icon name="apps-outline" size={20} color={selectedStatus === 'all' ? '#6200EE' : '#666'} />
        <Text style={[styles.sidebarItemText, selectedStatus === 'all' && styles.sidebarItemTextActive]}>All Bookings</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.sidebarItem, selectedStatus === 'confirmed' && styles.sidebarItemActive]} onPress={() => { setSelectedStatus('confirmed'); setSidebarVisible(false); }}>
        <Icon name="checkmark-circle-outline" size={20} color={selectedStatus === 'confirmed' ? '#4CAF50' : '#666'} />
        <Text style={[styles.sidebarItemText, selectedStatus === 'confirmed' && styles.sidebarItemTextActive]}>Confirmed</Text>
        <TouchableOpacity onPress={() => showStatusBookings('confirmed')}>
          <Icon name="ellipsis-horizontal" size={20} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.sidebarItem, selectedStatus === 'pending' && styles.sidebarItemActive]} onPress={() => { setSelectedStatus('pending'); setSidebarVisible(false); }}>
        <Icon name="time-outline" size={20} color={selectedStatus === 'pending' ? '#FF9800' : '#666'} />
        <Text style={[styles.sidebarItemText, selectedStatus === 'pending' && styles.sidebarItemTextActive]}>Pending</Text>
        <TouchableOpacity onPress={() => showStatusBookings('pending')}>
          <Icon name="ellipsis-horizontal" size={20} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.sidebarItem, selectedStatus === 'checkedIn' && styles.sidebarItemActive]} onPress={() => { setSelectedStatus('checkedIn'); setSidebarVisible(false); }}>
        <Icon name="enter-outline" size={20} color={selectedStatus === 'checkedIn' ? '#2196F3' : '#666'} />
        <Text style={[styles.sidebarItemText, selectedStatus === 'checkedIn' && styles.sidebarItemTextActive]}>Checked In</Text>
        <TouchableOpacity onPress={() => showStatusBookings('checkedIn')}>
          <Icon name="ellipsis-horizontal" size={20} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.sidebarItem, selectedStatus === 'notCheckedIn' && styles.sidebarItemActive]} onPress={() => { setSelectedStatus('notCheckedIn'); setSidebarVisible(false); }}>
        <Icon name="log-out-outline" size={20} color={selectedStatus === 'notCheckedIn' ? '#FF9800' : '#666'} />
        <Text style={[styles.sidebarItemText, selectedStatus === 'notCheckedIn' && styles.sidebarItemTextActive]}>Not Checked In</Text>
        <TouchableOpacity onPress={() => showStatusBookings('notCheckedIn')}>
          <Icon name="ellipsis-horizontal" size={20} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.sidebarItem, selectedStatus === 'cancelled' && styles.sidebarItemActive]} onPress={() => { setSelectedStatus('cancelled'); setSidebarVisible(false); }}>
        <Icon name="close-circle-outline" size={20} color={selectedStatus === 'cancelled' ? '#F44336' : '#666'} />
        <Text style={[styles.sidebarItemText, selectedStatus === 'cancelled' && styles.sidebarItemTextActive]}>Cancelled</Text>
        <TouchableOpacity onPress={() => showStatusBookings('cancelled')}>
          <Icon name="ellipsis-horizontal" size={20} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );

  const BookingDetailsModal = () => (
    <Modal visible={showBookingDetails} animationType="slide" transparent={true} onRequestClose={handleBack}>
      <View style={styles.detailsModalOverlay}>
        <View style={styles.detailsModalContent}>
          <View style={styles.detailsModalHeader}>
            <TouchableOpacity onPress={handleBack}>
              <Icon name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.detailsModalTitle}>Booking Details</Text>
            <View style={{width: 24}} />
          </View>
          <ScrollView style={styles.detailsModalBody}>
            {bookingData && (
              <>
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>BOOKING INFORMATION</Text>
                  <Text style={styles.detailsBookingRef}>{bookingData.bookingReference}</Text>
                  <View style={styles.detailsStatusRow}>
                    <View style={[styles.detailsStatusBadge, { backgroundColor: bookingData.checkedIn ? '#4CAF50' : '#FF9800' }]}>
                      <Text style={styles.detailsStatusText}>{bookingData.checkedIn ? 'CHECKED IN' : 'NOT CHECKED IN'}</Text>
                    </View>
                    <View style={[styles.detailsStatusBadge, { backgroundColor: getStatusColor(bookingData.status) }]}>
                      <Text style={styles.detailsStatusText}>{bookingData.status?.toUpperCase() || 'PENDING'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>PLAY INFORMATION</Text>
                  <Text style={styles.detailsPlayTitle}>{bookingData.playTitle}</Text>
                  <View style={styles.detailsRow}>
                    <Icon name="calendar-outline" size={18} color="#666" />
                    <Text style={styles.detailsRowText}>Date: {formatDate(bookingData.playDate)}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Icon name="time-outline" size={18} color="#666" />
                    <Text style={styles.detailsRowText}>Time: {formatTime(bookingData.playDate)}</Text>
                  </View>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>CUSTOMER INFORMATION</Text>
                  <Text style={styles.detailsCustomerName}>{bookingData.customerName}</Text>
                  <View style={styles.detailsRow}>
                    <Icon name="mail-outline" size={18} color="#666" />
                    <Text style={styles.detailsRowText}>{bookingData.customerEmail}</Text>
                  </View>
                  {bookingData.customerPhone && (
                    <View style={styles.detailsRow}>
                      <Icon name="call-outline" size={18} color="#666" />
                      <Text style={styles.detailsRowText}>{bookingData.customerPhone}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>TICKET DETAILS</Text>
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailsGridItem}>
                      <Text style={styles.detailsGridLabel}>Ticket Type</Text>
                      <Text style={styles.detailsGridValue}>{bookingData.ticketType?.toUpperCase()}</Text>
                    </View>
                    <View style={styles.detailsGridItem}>
                      <Text style={styles.detailsGridLabel}>Quantity</Text>
                      <Text style={styles.detailsGridValue}>{bookingData.quantity} persons</Text>
                    </View>
                    <View style={styles.detailsGridItem}>
                      <Text style={styles.detailsGridLabel}>Total Price</Text>
                      <Text style={[styles.detailsGridValue, {color: '#6200EE'}]}>KES {bookingData.totalPrice}</Text>
                    </View>
                  </View>
                  
                  {bookingData.allocatedSeats?.length > 0 && (
                    <>
                      <Text style={styles.detailsSectionSubtitle}>Assigned Seats</Text>
                      <View style={styles.seatsContainer}>
                        {bookingData.allocatedSeats.map((seat, index) => (
                          <View key={index} style={styles.seatChip}>
                            <Text style={styles.seatText}>{seat.number}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>PAYMENT INFORMATION</Text>
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailsGridItem}>
                      <Text style={styles.detailsGridLabel}>Payment Method</Text>
                      <Text style={styles.detailsGridValue}>{bookingData.paymentMethod?.toUpperCase()}</Text>
                    </View>
                    <View style={styles.detailsGridItem}>
                      <Text style={styles.detailsGridLabel}>Payment Status</Text>
                      <View style={[styles.detailsStatusBadge, { backgroundColor: bookingData.paymentStatus === 'approved' ? '#4CAF50' : '#FF9800' }]}>
                        <Text style={styles.detailsStatusText}>{bookingData.paymentStatus?.toUpperCase() || 'PENDING'}</Text>
                      </View>
                    </View>
                  </View>
                  {bookingData.paymentCode && (
                    <>
                      <Text style={styles.detailsSectionSubtitle}>Payment Code</Text>
                      <Text style={styles.paymentCode}>{bookingData.paymentCode}</Text>
                    </>
                  )}
                </View>

                {bookingData.checkedIn && bookingData.checkInTime && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsSectionTitle}>CHECK-IN INFORMATION</Text>
                    <View style={styles.detailsRow}>
                      <Icon name="checkmark-done-circle" size={18} color="#4CAF50" />
                      <Text style={[styles.detailsRowText, {color: '#4CAF50'}]}>
                        Checked in at {formatDateTime(bookingData.checkInTime)}
                      </Text>
                    </View>
                  </View>
                )}

                {!bookingData.checkedIn && (
                  <View style={styles.detailsActions}>
                    <TouchableOpacity style={styles.checkInButtonLarge} onPress={checkInCustomer}>
                      <Icon name="enter-outline" size={22} color="#fff" />
                      <Text style={styles.checkInButtonLargeText}>Check In Customer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={() => setSidebarVisible(true)}>
            <Icon name="filter-outline" size={24} color="#6200EE" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Ticket Verification</Text>
            <Text style={styles.subtitle}>Verify and check-in customers</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.messageButton} 
              onPress={() => navigation.navigate("EmployeeInboxScreen")}
            >
              <Icon name="chatbubble-ellipses-outline" size={24} color="#6200EE" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Icon name="log-out-outline" size={24} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <TextInput style={styles.input} placeholder="Enter Booking Reference" value={bookingRef} onChangeText={setBookingRef} autoCapitalize="characters" />
            <TouchableOpacity style={styles.scanButton} onPress={handleScanQR}><Icon name="qr-code-outline" size={24} color="#6200EE" /></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.verifyButton} onPress={verifyBooking} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <><Icon name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.verifyButtonText}>Verify Ticket</Text></>}
          </TouchableOpacity>
        </View>

        <View style={styles.bookingsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedStatus === 'all' ? 'All' : 
               selectedStatus === 'checkedIn' ? 'Checked In' :
               selectedStatus === 'notCheckedIn' ? 'Not Checked In' : 
               getStatusText(selectedStatus)} ({filteredBookings.length})
            </Text>
            <TouchableOpacity style={styles.toggleButton} onPress={() => setShowAllBookings(!showAllBookings)}>
              <Text style={styles.toggleButtonText}>{showAllBookings ? 'Today' : 'All'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.bookingsList} showsVerticalScrollIndicator={false}>
            {filteredBookings.map((booking) => (
              <TouchableOpacity key={booking.id} style={styles.bookingItem} onPress={() => { 
                setBookingRef(booking.bookingReference); 
                verifyBooking(); 
              }}>
                <View style={styles.bookingItemLeft}>
                  <Text style={styles.bookingItemRef}>{booking.bookingReference}</Text>
                  <Text style={styles.bookingItemCustomer}>{booking.customerName}</Text>
                  <View style={styles.bookingItemDetails}>
                    <Text style={styles.bookingItemPlay}>{booking.playTitle}</Text>
                    <Text style={styles.bookingItemDate}>{formatDate(booking.playDate)} {formatTime(booking.playDate)}</Text>
                  </View>
                </View>
                <View style={styles.bookingItemRight}>
                  <Text style={styles.bookingItemQuantity}>{booking.quantity} pax</Text>
                  <View style={[styles.bookingItemStatus, { backgroundColor: booking.checkedIn ? '#4CAF50' : getStatusColor(booking.status) }]}>
                    <Text style={styles.bookingItemStatusText}>{booking.checkedIn ? 'In' : booking.status || 'Pending'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            {filteredBookings.length === 0 && <Text style={styles.emptyText}>No bookings found</Text>}
          </ScrollView>
        </View>
      </View>

      {/* Sidebar Modal */}
      <Modal visible={sidebarVisible} animationType="slide" transparent={true} onRequestClose={() => setSidebarVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSidebarVisible(false)}>
          <View style={styles.modalContent}>
            <StatusSidebar />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Status Bookings Modal */}
      <Modal visible={statusModalVisible} animationType="slide" transparent={true} onRequestClose={() => setStatusModalVisible(false)}>
        <View style={styles.statusModalOverlay}>
          <View style={styles.statusModalContent}>
            <View style={styles.statusModalHeader}>
              <Text style={styles.statusModalTitle}>{selectedStatusFilter} Bookings ({statusBookings.length})</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.statusModalList}>
              {statusBookings.map((booking) => (
                <TouchableOpacity key={booking.id} style={styles.statusModalItem} onPress={() => { 
                  setBookingRef(booking.bookingReference); 
                  verifyBooking(); 
                  setStatusModalVisible(false); 
                }}>
                  <Text style={styles.statusModalRef}>{booking.bookingReference}</Text>
                  <Text style={styles.statusModalCustomer}>{booking.customerName}</Text>
                  <Text style={styles.statusModalPlay}>{booking.playTitle}</Text>
                  <Text style={styles.statusModalTime}>{formatTime(booking.playDate)} • {booking.quantity} seats</Text>
                </TouchableOpacity>
              ))}
              {statusBookings.length === 0 && <Text style={styles.statusModalEmpty}>No bookings found</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Booking Details Modal */}
      <BookingDetailsModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  menuButton: { padding: 8 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  messageButton: { padding: 8, marginRight: 8 },
  logoutButton: { padding: 8 },
  searchContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginRight: 10 },
  scanButton: { padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8 },
  verifyButton: { flexDirection: 'row', backgroundColor: '#6200EE', borderRadius: 8, padding: 14, alignItems: 'center', justifyContent: 'center' },
  verifyButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  bookingsSection: { flex: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  toggleButton: { backgroundColor: '#6200EE', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 6 },
  toggleButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  bookingsList: { flex: 1 },
  bookingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 8 },
  bookingItemLeft: { flex: 1 },
  bookingItemRef: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  bookingItemCustomer: { fontSize: 14, color: '#666', marginTop: 2 },
  bookingItemDetails: { marginTop: 8 },
  bookingItemPlay: { fontSize: 14, fontWeight: '500', color: '#333' },
  bookingItemDate: { fontSize: 12, color: '#999', marginTop: 2 },
  bookingItemRight: { alignItems: 'flex-end' },
  bookingItemQuantity: { fontSize: 14, color: '#333', marginBottom: 4 },
  bookingItemStatus: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  bookingItemStatusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#999', fontSize: 16, marginTop: 20 },
  // Sidebar Styles
  sidebar: { width: 280, backgroundColor: '#fff', height: '100%', padding: 20, paddingTop: 50 },
  sidebarCloseButton: { position: 'absolute', top: 10, right: 10, padding: 10 },
  sidebarTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, marginBottom: 8, borderRadius: 8, backgroundColor: '#f8f9fa' },
  sidebarItemActive: { backgroundColor: '#6200EE10', borderLeftWidth: 4, borderLeftColor: '#6200EE' },
  sidebarItemText: { flex: 1, fontSize: 16, color: '#333', marginLeft: 12 },
  sidebarItemTextActive: { color: '#6200EE', fontWeight: '600' },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { flex: 1, flexDirection: 'row' },
  // Status Modal Styles
  statusModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  statusModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  statusModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  statusModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  statusModalList: { padding: 20 },
  statusModalItem: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 15, marginBottom: 10 },
  statusModalRef: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statusModalCustomer: { fontSize: 14, color: '#666', marginTop: 4 },
  statusModalPlay: { fontSize: 14, fontWeight: '500', color: '#333', marginTop: 8 },
  statusModalTime: { fontSize: 12, color: '#999', marginTop: 4 },
  statusModalEmpty: { textAlign: 'center', color: '#999', fontSize: 16, padding: 20 },
  // Booking Details Modal Styles
  detailsModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailsModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  detailsModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  detailsModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  detailsModalBody: { padding: 20 },
  detailsSection: { marginBottom: 25 },
  detailsSectionTitle: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailsSectionSubtitle: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8, marginTop: 5 },
  detailsBookingRef: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  detailsStatusRow: { flexDirection: 'row', marginBottom: 15 },
  detailsStatusBadge: { borderRadius: 15, paddingHorizontal: 12, paddingVertical: 6, marginRight: 10 },
  detailsStatusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  detailsPlayTitle: { fontSize: 20, fontWeight: '600', color: '#333', marginBottom: 10 },
  detailsCustomerName: { fontSize: 18, fontWeight: '500', color: '#333', marginBottom: 10 },
  detailsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailsRowText: { marginLeft: 10, fontSize: 16, color: '#666' },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  detailsGridItem: { width: '48%', marginBottom: 12 },
  detailsGridLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  detailsGridValue: { fontSize: 16, fontWeight: '500', color: '#333' },
  seatsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  seatChip: { backgroundColor: '#6200EE', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  seatText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  paymentCode: { fontSize: 16, fontFamily: 'monospace', color: '#333', backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8, marginTop: 5 },
  detailsActions: { marginTop: 20, marginBottom: 10 },
  checkInButtonLarge: { flexDirection: 'row', backgroundColor: '#4CAF50', borderRadius: 10, padding: 18, alignItems: 'center', justifyContent: 'center' },
  checkInButtonLargeText: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 10 },
});