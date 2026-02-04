import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, TextInput, Modal, FlatList, RefreshControl, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const { width } = Dimensions.get('window');

const ManagerBookingsScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0, cancelled: 0, revenue: 0 });

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get('http://192.168.0.103:5000/api/bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setBookings(response.data.bookings);
        calculateStats(response.data.bookings);
      }
    } catch (err) {
      console.error('Fetch bookings error:', err);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (data) => {
    const total = data.length;
    const confirmed = data.filter(b => b.status === 'confirmed').length;
    const pending = data.filter(b => b.status === 'pending').length;
    const cancelled = data.filter(b => b.status === 'cancelled').length;
    const revenue = data.filter(b => b.status === 'confirmed' && b.paymentStatus === 'approved').reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    setStats({ total, confirmed, pending, cancelled, revenue });
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.bookingReference?.toLowerCase().includes(searchTerm.toLowerCase()) || booking.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || booking.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) || booking.playTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return 'Invalid date'; }
  };

  const getStatusColor = (status) => ({ confirmed: '#4CAF50', pending: '#FF9800', cancelled: '#F44336' }[status] || '#757575');
  const getPaymentColor = (paymentStatus) => ({ approved: '#4CAF50', pending: '#FF9800', rejected: '#F44336' }[paymentStatus] || '#757575');

  useEffect(() => { fetchBookings(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200EE" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderBookingItem = ({ item }) => (
    <View style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingRef}>{item.bookingReference}</Text>
        <View style={styles.statusBadge}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status?.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.playTitle}>{item.playTitle}</Text>
      <Text style={styles.customerInfo}>{item.customerName} • {item.customerEmail}</Text>
      <View style={styles.bookingDetails}>
        <View style={styles.detailItem}><Icon name="ticket-outline" size={16} color="#666" /><Text style={styles.detailText}>{item.quantity} seat(s) • {item.ticketType}</Text></View>
        <View style={styles.detailItem}><Icon name="cash-outline" size={16} color="#666" /><Text style={styles.detailText}>{formatCurrency(item.totalPrice)}</Text></View>
        <View style={styles.detailItem}><Icon name="calendar-outline" size={16} color="#666" /><Text style={styles.detailText}>{formatDate(item.playDate)}</Text></View>
      </View>
      <View style={styles.bookingFooter}>
        <View style={[styles.paymentBadge, { backgroundColor: `${getPaymentColor(item.paymentStatus)}20` }]}>
          <Text style={[styles.paymentText, { color: getPaymentColor(item.paymentStatus) }]}>{item.paymentStatus?.toUpperCase()}</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={() => { setSelectedBooking(item); setViewModalVisible(true); }}>
            <Icon name="eye-outline" size={20} color="#2196F3" />
          </TouchableOpacity>
          {item.paymentStatus === 'pending' && (
            <TouchableOpacity style={styles.actionButton} onPress={() => handleApprovePayment(item.id)}>
              <Icon name="checkmark-circle-outline" size={20} color="#4CAF50" />
            </TouchableOpacity>
          )}
          {item.status !== 'cancelled' && (
            <TouchableOpacity style={styles.actionButton} onPress={() => handleCancelBooking(item.id)}>
              <Icon name="close-circle-outline" size={20} color="#F44336" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#6200EE" barStyle="light-content" />
      <View style={styles.header}>
        <View><Text style={styles.title}>Bookings Management</Text><Text style={styles.subtitle}>Manage all bookings</Text></View>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchBookings}><Icon name="refresh-outline" size={24} color="#6200EE" /></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}><Text style={styles.statValue}>{stats.total}</Text><Text style={styles.statLabel}>Total</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.confirmed}</Text><Text style={styles.statLabel}>Confirmed</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, { color: '#FF9800' }]}>{stats.pending}</Text><Text style={styles.statLabel}>Pending</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, { color: '#F44336' }]}>{stats.cancelled}</Text><Text style={styles.statLabel}>Cancelled</Text></View>
          <View style={styles.statCard}><Text style={[styles.statValue, { color: '#6200EE' }]}>{formatCurrency(stats.revenue)}</Text><Text style={styles.statLabel}>Revenue</Text></View>
        </View>
      </ScrollView>
      <View style={styles.filterContainer}>
        <View style={styles.searchContainer}>
          <Icon name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="Search bookings..." value={searchTerm} onChangeText={setSearchTerm} />
        </View>
        <View style={styles.filterRow}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]} onPress={() => setFilterStatus('all')}>
                <Text style={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextActive]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, filterStatus === 'confirmed' && styles.filterChipActive]} onPress={() => setFilterStatus('confirmed')}>
                <Text style={[styles.filterChipText, filterStatus === 'confirmed' && styles.filterChipTextActive]}>Confirmed</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, filterStatus === 'pending' && styles.filterChipActive]} onPress={() => setFilterStatus('pending')}>
                <Text style={[styles.filterChipText, filterStatus === 'pending' && styles.filterChipTextActive]}>Pending</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, filterStatus === 'cancelled' && styles.filterChipActive]} onPress={() => setFilterStatus('cancelled')}>
                <Text style={[styles.filterChipText, filterStatus === 'cancelled' && styles.filterChipTextActive]}>Cancelled</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </View>
      <FlatList
        data={filteredBookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6200EE']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="receipt-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No bookings found</Text>
            <Text style={styles.emptySubtext}>Try changing your filters</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
      <Modal visible={viewModalVisible} animationType="slide" transparent={true} onRequestClose={() => setViewModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {selectedBooking && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Booking Details</Text>
                    <TouchableOpacity onPress={() => setViewModalVisible(false)}><Icon name="close" size={24} color="#333" /></TouchableOpacity>
                  </View>
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>PLAY INFORMATION</Text>
                    <Text style={styles.modalPlayTitle}>{selectedBooking.playTitle}</Text>
                    <View style={styles.modalDetailRow}><Icon name="calendar-outline" size={16} color="#666" /><Text style={styles.modalDetailText}>{formatDate(selectedBooking.playDate)}</Text></View>
                  </View>
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>CUSTOMER INFORMATION</Text>
                    <Text style={styles.modalText}>{selectedBooking.customerName}</Text>
                    <View style={styles.modalDetailRow}><Icon name="mail-outline" size={16} color="#666" /><Text style={styles.modalDetailText}>{selectedBooking.customerEmail}</Text></View>
                    {selectedBooking.customerPhone && (<View style={styles.modalDetailRow}><Icon name="call-outline" size={16} color="#666" /><Text style={styles.modalDetailText}>{selectedBooking.customerPhone}</Text></View>)}
                  </View>
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>TICKET DETAILS</Text>
                    <View style={styles.modalGrid}>
                      <View style={styles.modalGridItem}><Text style={styles.modalLabel}>Type</Text><Text style={styles.modalValue}>{selectedBooking.ticketType?.toUpperCase()}</Text></View>
                      <View style={styles.modalGridItem}><Text style={styles.modalLabel}>Quantity</Text><Text style={styles.modalValue}>{selectedBooking.quantity}</Text></View>
                      <View style={styles.modalGridItem}><Text style={styles.modalLabel}>Total</Text><Text style={[styles.modalValue, { color: '#6200EE' }]}>{formatCurrency(selectedBooking.totalPrice)}</Text></View>
                    </View>
                    <Text style={styles.modalLabel}>Allocated Seats</Text>
                    <View style={styles.seatsContainer}>
                      {selectedBooking.allocatedSeats?.map((seat, index) => (<View key={index} style={styles.seatChip}><Text style={styles.seatText}>{seat.number}</Text></View>))}
                    </View>
                  </View>
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>PAYMENT INFORMATION</Text>
                    <View style={styles.modalGrid}>
                      <View style={styles.modalGridItem}><Text style={styles.modalLabel}>Method</Text><Text style={styles.modalValue}>{selectedBooking.paymentMethod?.toUpperCase()}</Text></View>
                      <View style={styles.modalGridItem}>
                        <Text style={styles.modalLabel}>Status</Text>
                        <View style={[styles.statusBadge, { backgroundColor: `${getPaymentColor(selectedBooking.paymentStatus)}20` }]}>
                          <Text style={[styles.statusText, { color: getPaymentColor(selectedBooking.paymentStatus) }]}>{selectedBooking.paymentStatus?.toUpperCase()}</Text>
                        </View>
                      </View>
                    </View>
                    {selectedBooking.paymentCode && (<><Text style={styles.modalLabel}>Payment Code</Text><Text style={styles.paymentCode}>{selectedBooking.paymentCode}</Text></>)}
                  </View>
                  <View style={styles.modalActions}>
                    <TouchableOpacity style={[styles.modalButton, styles.secondaryButton]} onPress={() => setViewModalVisible(false)}>
                      <Text style={styles.secondaryButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  refreshButton: { padding: 8 },
  statsScroll: { backgroundColor: '#fff', paddingVertical: 15 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 15 },
  statCard: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 15, marginRight: 10, minWidth: 100, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#666' },
  filterContainer: { backgroundColor: '#fff', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 8, paddingHorizontal: 15, marginBottom: 15 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#333' },
  filterRow: { marginBottom: 5 },
  filterGroup: { marginBottom: 10 },
  filterLabel: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8 },
  filterChip: { backgroundColor: '#f8f9fa', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 8 },
  filterChipActive: { backgroundColor: '#6200EE' },
  filterChipText: { fontSize: 14, color: '#666' },
  filterChipTextActive: { color: '#fff' },
  listContainer: { padding: 15 },
  bookingCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bookingRef: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statusBadge: { backgroundColor: '#f8f9fa', borderRadius: 15, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '500' },
  playTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 5 },
  customerInfo: { fontSize: 14, color: '#666', marginBottom: 10 },
  bookingDetails: { marginBottom: 10 },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  detailText: { fontSize: 14, color: '#666', marginLeft: 8 },
  bookingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  paymentBadge: { borderRadius: 15, paddingHorizontal: 10, paddingVertical: 4 },
  paymentText: { fontSize: 12, fontWeight: '500' },
  actionButtons: { flexDirection: 'row' },
  actionButton: { padding: 8, marginLeft: 10 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#666', marginTop: 10 },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalPlayTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  modalText: { fontSize: 16, color: '#333', marginBottom: 5 },
  modalDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  modalDetailText: { fontSize: 14, color: '#666', marginLeft: 8 },
  modalGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  modalGridItem: { flex: 1 },
  modalLabel: { fontSize: 14, color: '#666', marginBottom: 5 },
  modalValue: { fontSize: 16, fontWeight: '500', color: '#333' },
  seatsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  seatChip: { backgroundColor: '#6200EE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8, marginBottom: 8 },
  seatText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  paymentCode: { fontSize: 16, fontFamily: 'monospace', color: '#333', backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8, marginTop: 5 },
  modalActions: { flexDirection: 'row', padding: 20 },
  modalButton: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center' },
  secondaryButton: { backgroundColor: '#f8f9fa' },
  secondaryButtonText: { fontSize: 16, fontWeight: '500', color: '#333' },
});

export default ManagerBookingsScreen;