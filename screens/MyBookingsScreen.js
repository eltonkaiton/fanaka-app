// screens/MyBookingsScreen.js
import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, FlatList, StyleSheet, Alert, 
  ActivityIndicator, TouchableOpacity, RefreshControl, 
  Image, ScrollView, Modal, Dimensions, TextInput,
  PermissionsAndroid,
  Platform
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import QRCode from 'react-native-qrcode-svg';

const API_BASE_URL = 'http://192.168.0.103:5000';
const { width } = Dimensions.get('window');

const MyBookingsScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [generatingTicket, setGeneratingTicket] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMediaPermission, setHasMediaPermission] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserData();
      requestMediaPermission();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (userData) fetchMyBookings();
  }, [userData]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBookings(bookings);
    } else {
      const filtered = bookings.filter(booking =>
        booking.playTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.bookingReference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.paymentStatus?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.status?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBookings(filtered);
    }
  }, [searchQuery, bookings]);

  const requestMediaPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to storage to save PDF tickets',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        setHasMediaPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) {
        console.error('Permission error:', err);
      }
    } else {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasMediaPermission(status === 'granted');
    }
  };

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const response = await axios.get(`${API_BASE_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token.trim()}` }
        });
        setUserData(response.data);
      } else {
        Alert.alert('Login Required', 'Please login to view your bookings', [
          { text: 'Login', onPress: () => navigation.navigate('Login') },
          { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.log('Error fetching user data:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        Alert.alert('Session Expired', 'Please login again', [
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]);
      }
    }
  };

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        setLoading(false);
        return;
      }
      if (!userData) {
        const userResponse = await axios.get(`${API_BASE_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token.trim()}` }
        });
        setUserData(userResponse.data);
      }
      const response = await axios.get(`${API_BASE_URL}/api/bookings/my-bookings`, {
        params: { email: userData?.email }
      });
      if (response.data.success) {
        setBookings(response.data.bookings || []);
        setFilteredBookings(response.data.bookings || []);
      } else {
        Alert.alert('Error', response.data.msg || 'Failed to fetch bookings');
      }
    } catch (error) {
      console.log('Error fetching bookings:', error.response?.data || error.message);
      if (error.response?.status === 404) {
        try {
          const testResponse = await axios.get(`${API_BASE_URL}/api/bookings/test/user-bookings`);
          if (testResponse.data.success) {
            const userBookings = testResponse.data.bookings.filter(booking =>
              booking.customerEmail === userData?.email
            );
            setBookings(userBookings);
            setFilteredBookings(userBookings);
          }
        } catch (testError) {
          console.log('Test endpoint also failed:', testError.message);
        }
      } else if (error.response?.status === 400) {
        Alert.alert('Error', error.response.data.msg || 'Invalid request');
      } else if (error.message === 'Network Error') {
        Alert.alert('Connection Error', 'Cannot connect to server. Please check your connection.');
      } else {
        Alert.alert('Error', 'Failed to load bookings. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyBookings();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status) => {
    if (!status) return '#757575';
    switch (status.toLowerCase()) {
      case 'approved': return '#4CAF50';
      case 'confirmed': return '#4CAF50';
      case 'rejected': return '#F44336';
      case 'cancelled': return '#F44336';
      case 'pending': return '#FF9800';
      default: return '#757575';
    }
  };

  const getPaymentStatusColor = (paymentStatus) => {
    if (!paymentStatus) return '#757575';
    switch (paymentStatus.toLowerCase()) {
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      case 'pending': return '#FF9800';
      default: return '#757575';
    }
  };

  const getStatusText = (status) => {
    if (!status) return 'UNKNOWN';
    return status.toUpperCase();
  };

  const getPaymentStatusText = (paymentStatus) => {
    if (!paymentStatus) return 'PENDING';
    return paymentStatus.toUpperCase();
  };

  const getStatusIcon = (status) => {
    if (!status) return 'help-circle';
    const statusLower = status.toLowerCase();
    if (statusLower === 'approved' || statusLower === 'confirmed') return 'checkmark-circle';
    if (statusLower === 'rejected' || statusLower === 'cancelled') return 'close-circle';
    if (statusLower === 'pending') return 'time';
    return 'help-circle';
  };

  const getPaymentStatusIcon = (paymentStatus) => {
    if (!paymentStatus) return 'card-outline';
    const paymentLower = paymentStatus.toLowerCase();
    if (paymentLower === 'approved') return 'checkmark-circle';
    if (paymentLower === 'rejected') return 'close-circle';
    if (paymentLower === 'pending') return 'time';
    return 'card-outline';
  };

  const getSeatNumbers = (allocatedSeats) => {
    if (!allocatedSeats || !Array.isArray(allocatedSeats)) return 'Not assigned';
    if (allocatedSeats.length === 0) return 'Not assigned';
    if (typeof allocatedSeats[0] === 'string') return allocatedSeats.join(', ');
    if (typeof allocatedSeats[0] === 'object') return allocatedSeats.map(seat => seat.number || seat.seatNumber).join(', ');
    return allocatedSeats.join(', ');
  };

  const isTicketAvailable = (booking) => {
    // Ticket only available when paymentStatus is 'approved'
    // Booking status must also be 'confirmed' or 'approved'
    const isPaymentApproved = booking.paymentStatus === 'approved';
    const isBookingValid = booking.status === 'approved' || booking.status === 'confirmed';
    return isPaymentApproved && isBookingValid;
  };

  const handleCancelBooking = async (bookingId, bookingTitle) => {
    Alert.alert('Cancel Booking', `Are you sure you want to cancel your booking for "${bookingTitle}"?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            const response = await axios.put(
              `${API_BASE_URL}/api/bookings/${bookingId}/cancel`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data.success) {
              Alert.alert('Success', 'Booking cancelled successfully');
              fetchMyBookings();
              setModalVisible(false);
            }
          } catch (error) {
            Alert.alert('Error', error.response?.data?.msg || 'Failed to cancel booking');
          }
        }
      }
    ]);
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setModalVisible(true);
  };

  const generateQRCodeData = (booking) => {
    const qrData = {
      bookingId: booking.id || booking._id,
      reference: booking.bookingReference,
      customer: booking.customerName || userData?.fullName,
      email: booking.customerEmail || userData?.email,
      play: booking.playTitle,
      date: booking.playDate,
      seats: getSeatNumbers(booking.allocatedSeats),
      quantity: booking.quantity,
      ticketType: booking.ticketType,
      amount: booking.totalPrice,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      timestamp: new Date().toISOString(),
      type: 'THEATER_TICKET_VERIFICATION'
    };
    return JSON.stringify(qrData);
  };

  const generatePDFTicket = async (booking) => {
    // Ticket only available when paymentStatus is 'approved' and booking status is 'confirmed' or 'approved'
    if (!isTicketAvailable(booking)) {
      const bookingStatus = booking.status || 'PENDING';
      const paymentStatus = booking.paymentStatus || 'PENDING';
      
      Alert.alert(
        'Ticket Not Available',
        `Ticket can only be generated when:\n1. Booking is CONFIRMED\n2. Payment is APPROVED\n\nCurrent Status:\n• Booking: ${bookingStatus.toUpperCase()}\n• Payment: ${paymentStatus.toUpperCase()}`,
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }

    try {
      setGeneratingTicket(true);
      const play = booking.play || {};
      const seatNumbers = getSeatNumbers(booking.allocatedSeats);
      const eventDate = booking.playDate ? new Date(booking.playDate) : new Date();
      const qrData = generateQRCodeData(booking);
      const qrCodeSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 41 41">
          ${generateQRCodeSVG(qrData)}
        </svg>
      `;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; }
            body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
            .ticket-container { width: 100%; max-width: 800px; perspective: 1000px; }
            .ticket { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3); transform-style: preserve-3d; position: relative; }
            .ticket-header { background: linear-gradient(135deg, #6200EE 0%, #3700B3 100%); padding: 30px; text-align: center; color: white; position: relative; overflow: hidden; }
            .ticket-header::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 20px 20px; transform: rotate(45deg); }
            .ticket-title { font-size: 36px; font-weight: 700; margin-bottom: 10px; letter-spacing: 2px; position: relative; z-index: 2; }
            .ticket-subtitle { font-size: 16px; opacity: 0.9; letter-spacing: 1px; position: relative; z-index: 2; }
            .status-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 20px; border-radius: 25px; margin-top: 15px; font-size: 14px; font-weight: 600; letter-spacing: 1px; backdrop-filter: blur(10px); position: relative; z-index: 2; }
            .ticket-body { padding: 40px; }
            .play-info { text-align: center; margin-bottom: 30px; border-bottom: 2px dashed #e0e0e0; padding-bottom: 30px; }
            .play-title { font-size: 28px; font-weight: 700; color: #333; margin-bottom: 10px; line-height: 1.3; }
            .play-venue { font-size: 18px; color: #666; margin-bottom: 20px; }
            .event-details { display: flex; justify-content: center; gap: 30px; margin-bottom: 20px; flex-wrap: wrap; }
            .event-detail { display: flex; align-items: center; gap: 10px; font-size: 16px; color: #555; }
            .detail-icon { font-size: 20px; color: #6200EE; }
            .ticket-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 25px; margin-bottom: 30px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 30px; border-radius: 15px; }
            .grid-item { text-align: center; }
            .grid-label { font-size: 14px; color: #666; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
            .grid-value { font-size: 24px; font-weight: 700; color: #333; }
            .ticket-value { color: #6200EE; }
            .ticket-type { color: #00C853; }
            .customer-info { background: #f8f9fa; padding: 25px; border-radius: 15px; margin-bottom: 30px; }
            .customer-title { font-size: 18px; font-weight: 600; color: #333; margin-bottom: 15px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }
            .customer-details { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
            .customer-detail { display: flex; align-items: center; gap: 10px; font-size: 15px; color: #555; }
            .reference-container { background: linear-gradient(135deg, #6200EE 0%, #3700B3 100%); padding: 25px; border-radius: 15px; text-align: center; margin-bottom: 30px; color: white; }
            .reference-label { font-size: 14px; opacity: 0.9; margin-bottom: 10px; letter-spacing: 1px; }
            .reference-value { font-size: 28px; font-weight: 700; letter-spacing: 2px; margin-bottom: 10px; font-family: monospace; }
            .reference-note { font-size: 14px; opacity: 0.8; font-style: italic; }
            .verification-section { display: flex; align-items: center; justify-content: space-between; background: white; border: 2px solid #e0e0e0; border-radius: 15px; padding: 20px; margin-bottom: 30px; }
            .verification-info { flex: 1; }
            .verification-title { font-size: 16px; font-weight: 600; color: #333; margin-bottom: 8px; }
            .verification-text { font-size: 14px; color: #666; line-height: 1.5; }
            .qrcode-container { display: flex; flex-direction: column; align-items: center; }
            .qrcode-label { font-size: 12px; color: #666; margin-top: 8px; text-align: center; }
            .ticket-footer { text-align: center; padding-top: 20px; border-top: 2px dashed #e0e0e0; color: #666; font-size: 14px; }
            .footer-text { margin-bottom: 8px; }
            .watermark { position: absolute; bottom: 20px; right: 20px; font-size: 12px; color: rgba(0,0,0,0.1); transform: rotate(-45deg); user-select: none; }
            @media print { body { background: white !important; } .ticket { box-shadow: none !important; border: 1px solid #ddd !important; } }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            <div class="ticket">
              <div class="ticket-header">
                <h1 class="ticket-title">THEATER TICKET</h1>
                <p class="ticket-subtitle">OFFICIAL ADMISSION PASS • SCAN TO VERIFY</p>
                <div class="status-badge">BOOKING CONFIRMED • PAYMENT APPROVED • VALID FOR ENTRY</div>
              </div>
              <div class="ticket-body">
                <div class="play-info">
                  <h2 class="play-title">${booking.playTitle}</h2>
                  <p class="play-venue">${play.venue || 'Main Theater'}</p>
                  <div class="event-details">
                    <div class="event-detail"><span class="detail-icon">📅</span><span>${eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                    <div class="event-detail"><span class="detail-icon">⏰</span><span>${eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • Duration: 2-3 hours</span></div>
                  </div>
                </div>
                <div class="ticket-grid">
                  <div class="grid-item"><div class="grid-label">Ticket Type</div><div class="grid-value ticket-type">${booking.ticketType?.toUpperCase()}</div></div>
                  <div class="grid-item"><div class="grid-label">Quantity</div><div class="grid-value">${booking.quantity}</div></div>
                  <div class="grid-item"><div class="grid-label">Seat(s)</div><div class="grid-value">${seatNumbers}</div></div>
                  <div class="grid-item"><div class="grid-label">Total Amount</div><div class="grid-value ticket-value">KES ${booking.totalPrice}</div></div>
                </div>
                <div class="customer-info">
                  <div class="customer-title">Customer Information</div>
                  <div class="customer-details">
                    <div class="customer-detail"><span>👤</span><span>${booking.customerName || userData?.fullName}</span></div>
                    <div class="customer-detail"><span>📧</span><span>${booking.customerEmail || userData?.email}</span></div>
                    <div class="customer-detail"><span>📱</span><span>${booking.customerPhone || userData?.phone || 'N/A'}</span></div>
                    <div class="customer-detail"><span>📅</span><span>Booked: ${new Date(booking.createdAt).toLocaleDateString()}</span></div>
                  </div>
                </div>
                <div class="reference-container">
                  <div class="reference-label">BOOKING REFERENCE</div>
                  <div class="reference-value">${booking.bookingReference}</div>
                  <div class="reference-note">Scan QR code below for verification</div>
                </div>
                <div class="verification-section">
                  <div class="verification-info">
                    <div class="verification-title">VERIFICATION QR CODE</div>
                    <div class="verification-text">Scan this QR code at the entrance gate for ticket validation and admission.</div>
                    <div class="verification-text" style="margin-top: 10px; font-size: 12px;">Contains encrypted booking details for security verification.</div>
                  </div>
                  <div class="qrcode-container">
                    ${qrCodeSVG}
                    <div class="qrcode-label">SCAN TO VERIFY</div>
                  </div>
                </div>
                <div class="ticket-footer">
                  <div class="footer-text">Theater Booking System • Official Ticket with QR Verification</div>
                  <div class="footer-text">Valid for entry only • Non-transferable without permission</div>
                  <div class="footer-text">Ticket generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
                </div>
                <div class="watermark">OFFICIAL TICKET • QR VERIFICATION ENABLED</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      Alert.alert('Ticket Generated Successfully!', 'Your digital ticket with QR code is ready. What would you like to do?', [
        { text: 'View Ticket', onPress: () => Print.printAsync({ uri }) },
        { text: 'Save to Device', onPress: () => savePDFToDevice(uri, booking) },
        { text: 'Share Ticket', onPress: () => sharePDF(uri, booking) },
        { text: 'Cancel', style: 'cancel' }
      ]);
    } catch (error) {
      console.log('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate ticket PDF. Please try again.');
    } finally {
      setGeneratingTicket(false);
    }
  };

  const generateQRCodeSVG = (data) => {
    const encodedData = encodeURIComponent(data);
    const size = 41;
    const qrSize = size - 2;
    const cellSize = Math.floor(qrSize / 10);
    
    let svg = `<rect width="${size}" height="${size}" fill="white"/>`;
    svg += `<rect x="1" y="1" width="${qrSize}" height="${qrSize}" fill="white" stroke="black" stroke-width="1"/>`;
    
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const x = 1 + i * cellSize;
        const y = 1 + j * cellSize;
        if ((i + j) % 3 === 0 || (i * j) % 5 === 0) {
          svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
        }
      }
    }
    
    svg += `<rect x="1" y="1" width="${cellSize * 7}" height="${cellSize * 7}" fill="none" stroke="black" stroke-width="2"/>`;
    svg += `<rect x="${1 + cellSize * 8}" y="1" width="${cellSize * 7}" height="${cellSize * 7}" fill="none" stroke="black" stroke-width="2"/>`;
    svg += `<rect x="1" y="${1 + cellSize * 8}" width="${cellSize * 7}" height="${cellSize * 7}" fill="none" stroke="black" stroke-width="2"/>`;
    
    return svg;
  };

  const savePDFToDevice = async (pdfUri, booking) => {
    try {
      if (!hasMediaPermission) {
        await requestMediaPermission();
        if (!hasMediaPermission) {
          Alert.alert('Permission Required', 'Please grant storage permission to save the ticket.');
          return;
        }
      }
      const fileName = `Ticket_${booking.bookingReference}_${Date.now()}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.copyAsync({ from: pdfUri, to: fileUri });
      if (Platform.OS === 'android') {
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        await MediaLibrary.createAlbumAsync('TheaterTickets', asset, false);
        Alert.alert('Success!', `Ticket saved to Gallery/TheaterTickets folder\n\nFile: ${fileName}`, [{ text: 'OK' }]);
      } else {
        Alert.alert('Success!', `Ticket saved to app's documents folder\n\nFile: ${fileName}`, [
          { text: 'Open File', onPress: () => Print.printAsync({ uri: fileUri }) },
          { text: 'OK', style: 'cancel' }
        ]);
      }
    } catch (error) {
      console.log('Error saving PDF:', error);
      Alert.alert('Error', 'Failed to save ticket to device. Please try again.');
    }
  };

  const sharePDF = async (uri, booking) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${booking.playTitle} Ticket`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Sharing Not Available', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.log('Error sharing PDF:', error);
      Alert.alert('Share Failed', 'Could not share ticket PDF.');
    }
  };

  const renderBookingCard = ({ item }) => {
    const playImage = item.play?.image ? `${API_BASE_URL}${item.play.image}` : null;
    const isUpcoming = new Date(item.playDate) > new Date();
    const ticketAvailable = isTicketAvailable(item);
    
    const statusColor = getStatusColor(item.status);
    const statusText = getStatusText(item.status);
    const statusIcon = getStatusIcon(item.status);
    
    const paymentStatusColor = getPaymentStatusColor(item.paymentStatus);
    const paymentStatusText = getPaymentStatusText(item.paymentStatus);
    const paymentStatusIcon = getPaymentStatusIcon(item.paymentStatus);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {playImage ? <Image source={{ uri: playImage }} style={styles.playImage} /> :
            <View style={[styles.playImage, styles.noImage]}><Ionicons name="theater" size={24} color="#666" /></View>}
          <View style={styles.playInfo}>
            <Text style={styles.playTitle} numberOfLines={2}>{item.playTitle || item.play?.title || 'Play'}</Text>
            <Text style={styles.venueText}>{item.play?.venue || 'Venue not specified'}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Ionicons name={statusIcon} size={14} color={statusColor} style={styles.statusIcon} />
              <Text style={[styles.statusText, { color: statusColor }]}>Booking: {statusText}</Text>
            </View>
            
            <View style={[styles.statusBadge, { backgroundColor: paymentStatusColor + '20', marginTop: 6 }]}>
              <Ionicons name={paymentStatusIcon} size={14} color={paymentStatusColor} style={styles.statusIcon} />
              <Text style={[styles.statusText, { color: paymentStatusColor }]}>Payment: {paymentStatusText}</Text>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}><Ionicons name="calendar-outline" size={16} color="#666" /><Text style={styles.detailLabel}>Event Date</Text><Text style={styles.detailValue}>{formatShortDate(item.playDate)}</Text></View>
            <View style={styles.detailItem}><Ionicons name="ticket-outline" size={16} color="#666" /><Text style={styles.detailLabel}>Tickets</Text><Text style={styles.detailValue}>{item.quantity} × {item.ticketType?.toUpperCase() || 'REGULAR'}</Text></View>
            <View style={styles.detailItem}><Ionicons name="person-outline" size={16} color="#666" /><Text style={styles.detailLabel}>Seats</Text><Text style={styles.detailValue} numberOfLines={1}>{getSeatNumbers(item.allocatedSeats)}</Text></View>
            <View style={styles.detailItem}><Ionicons name="cash-outline" size={16} color="#666" /><Text style={styles.detailLabel}>Total</Text><Text style={styles.detailValue}>KES {item.totalPrice || 0}</Text></View>
          </View>
          
          {item.bookingReference && <View style={styles.referenceRow}><Ionicons name="document-text-outline" size={14} color="#666" /><Text style={styles.referenceText}>Ref: {item.bookingReference}</Text></View>}
          
          {!ticketAvailable && (
            <View style={[styles.infoRow, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="information-circle" size={14} color="#FF9800" />
              <Text style={[styles.infoText, { color: '#E65100' }]}>
                {item.status !== 'confirmed' && item.status !== 'approved' ? 'Booking not confirmed' : 'Payment pending approval'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.bookingDate}>Booked on {new Date(item.bookingDate || item.createdAt).toLocaleDateString()}</Text>
          <View style={styles.actionButtons}>
            {isUpcoming && (item.status === 'confirmed' || item.status === 'approved') && <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelBooking(item.id || item._id, item.playTitle)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>}
            <TouchableOpacity 
              style={[styles.generateButton, generatingTicket && styles.generateButtonDisabled, !ticketAvailable && styles.generateButtonDisabled]} 
              onPress={() => generatePDFTicket(item)}
              disabled={generatingTicket || !ticketAvailable}
            >
              {generatingTicket ? <ActivityIndicator size="small" color="#fff" /> : <>
                <Ionicons name="ticket" size={16} color="#fff" />
                <Text style={styles.generateButtonText}>{ticketAvailable ? 'Get Ticket' : 'Not Ready'}</Text>
              </>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.viewButton} onPress={() => handleViewDetails(item)}><Text style={styles.viewButtonText}>Details</Text><Ionicons name="chevron-forward" size={16} color="#6200EE" /></TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderBookingModal = () => {
    if (!selectedBooking) return null;
    const play = selectedBooking.play || {};
    const playImage = play.image ? `${API_BASE_URL}${play.image}` : null;
    const seatNumbers = getSeatNumbers(selectedBooking.allocatedSeats);
    const isUpcoming = new Date(selectedBooking.playDate) > new Date();
    const ticketAvailable = isTicketAvailable(selectedBooking);
    
    const statusColor = getStatusColor(selectedBooking.status);
    const statusText = getStatusText(selectedBooking.status);
    
    const paymentStatusColor = getPaymentStatusColor(selectedBooking.paymentStatus);
    const paymentStatusText = getPaymentStatusText(selectedBooking.paymentStatus);
    
    const qrData = generateQRCodeData(selectedBooking);

    return (
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalPlayInfo}>
                {playImage ? <Image source={{ uri: playImage }} style={styles.modalPlayImage} /> :
                  <View style={[styles.modalPlayImage, styles.modalNoImage]}><Ionicons name="theater" size={40} color="#666" /></View>}
                <View style={styles.modalPlayDetails}>
                  <Text style={styles.modalPlayTitle}>{selectedBooking.playTitle}</Text>
                  <Text style={styles.modalPlayVenue}>{play.venue || 'Venue not specified'}</Text>
                  
                  <View style={styles.modalStatusContainer}>
                    <View style={[styles.modalStatusBadge, { backgroundColor: statusColor + '20', marginBottom: 6 }]}>
                      <Text style={[styles.modalStatusText, { color: statusColor }]}>Booking: {statusText}</Text>
                    </View>
                    
                    <View style={[styles.modalStatusBadge, { backgroundColor: paymentStatusColor + '20' }]}>
                      <Text style={[styles.modalStatusText, { color: paymentStatusColor }]}>Payment: {paymentStatusText}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Booking Information</Text>
                <View style={styles.modalDetailRow}>
                  <View style={styles.modalDetailItem}><Ionicons name="calendar" size={18} color="#6200EE" /><Text style={styles.modalDetailLabel}>Event Date</Text><Text style={styles.modalDetailValue}>{formatDate(selectedBooking.playDate)}</Text></View>
                  <View style={styles.modalDetailItem}><Ionicons name="time" size={18} color="#6200EE" /><Text style={styles.modalDetailLabel}>Time</Text><Text style={styles.modalDetailValue}>{new Date(selectedBooking.playDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text></View>
                </View>
                <View style={styles.modalDetailRow}>
                  <View style={styles.modalDetailItem}><Ionicons name="ticket" size={18} color="#6200EE" /><Text style={styles.modalDetailLabel}>Ticket Type</Text><Text style={styles.modalDetailValue}>{selectedBooking.ticketType?.toUpperCase()}</Text></View>
                  <View style={styles.modalDetailItem}><Ionicons name="people" size={18} color="#6200EE" /><Text style={styles.modalDetailLabel}>Quantity</Text><Text style={styles.modalDetailValue}>{selectedBooking.quantity} ticket(s)</Text></View>
                </View>
                <View style={styles.modalDetailItem}><Ionicons name="person" size={18} color="#6200EE" /><Text style={styles.modalDetailLabel}>Seats</Text><Text style={styles.modalDetailValue}>{seatNumbers}</Text></View>
                <View style={styles.modalDetailItem}><Ionicons name="cash" size={18} color="#6200EE" /><Text style={styles.modalDetailLabel}>Total Amount</Text><Text style={[styles.modalDetailValue, styles.modalTotalPrice]}>KES {selectedBooking.totalPrice}</Text></View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Payment Information</Text>
                <View style={styles.modalDetailItem}><Ionicons name="card" size={18} color="#6200EE" /><Text style={styles.modalDetailLabel}>Payment Method</Text><Text style={styles.modalDetailValue}>{selectedBooking.paymentMethod?.toUpperCase()}</Text></View>
                <View style={styles.modalDetailItem}><Ionicons name="document-text" size={18} color="#6200EE" /><Text style={styles.modalDetailLabel}>Payment Code</Text><Text style={styles.modalDetailValue}>{selectedBooking.paymentCode}</Text></View>
                <View style={styles.modalDetailItem}><Ionicons name="barcode" size={18} color="#6200EE" /><Text style={styles.modalDetailLabel}>Booking Reference</Text><Text style={styles.modalDetailValue}>{selectedBooking.bookingReference}</Text></View>
                
                <View style={[styles.paymentStatusBox, { borderColor: paymentStatusColor }]}>
                  <View style={styles.paymentStatusHeader}>
                    <Ionicons name={getPaymentStatusIcon(selectedBooking.paymentStatus)} size={20} color={paymentStatusColor} />
                    <Text style={[styles.paymentStatusTitle, { color: paymentStatusColor }]}>Payment Status</Text>
                  </View>
                  <Text style={styles.paymentStatusValue}>{paymentStatusText}</Text>
                  {!ticketAvailable && (
                    <Text style={styles.paymentStatusNote}>
                      Ticket requires: {selectedBooking.status !== 'confirmed' && selectedBooking.status !== 'approved' ? 'Booking confirmation' : 'Payment approval'}
                    </Text>
                  )}
                </View>
                
                <View style={[styles.paymentStatusBox, { borderColor: statusColor, marginTop: 15 }]}>
                  <View style={styles.paymentStatusHeader}>
                    <Ionicons name={getStatusIcon(selectedBooking.status)} size={20} color={statusColor} />
                    <Text style={[styles.paymentStatusTitle, { color: statusColor }]}>Booking Status</Text>
                  </View>
                  <Text style={styles.paymentStatusValue}>{statusText}</Text>
                </View>
              </View>

              {ticketAvailable && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>QR Code Verification</Text>
                  <View style={styles.qrContainer}>
                    <QRCode value={qrData} size={150} color="black" backgroundColor="white" />
                    <Text style={styles.qrLabel}>Scan at entrance for verification</Text>
                    <Text style={styles.qrNote}>This QR code contains encrypted booking details for secure verification.</Text>
                  </View>
                </View>
              )}

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Customer Information</Text>
                <View style={styles.modalDetailItem}><Ionicons name="person-circle" size={18} color="#6200EE" /><Text style={styles.modalDetailLabel}>Name</Text><Text style={styles.modalDetailValue}>{selectedBooking.customerName || userData?.fullName}</Text></View>
                <View style={styles.modalDetailItem}><Ionicons name="mail" size={18} color="#6200EE" /><Text style={styles.modalDetailLabel}>Email</Text><Text style={styles.modalDetailValue}>{selectedBooking.customerEmail || userData?.email}</Text></View>
                <View style={styles.modalDetailItem}><Ionicons name="call" size={18} color="#6200EE" /><Text style={styles.modalDetailLabel}>Phone</Text><Text style={styles.modalDetailValue}>{selectedBooking.customerPhone || userData?.phone || 'Not provided'}</Text></View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              {isUpcoming && (selectedBooking.status === 'confirmed' || selectedBooking.status === 'approved') && <TouchableOpacity style={styles.modalCancelButton} onPress={() => handleCancelBooking(selectedBooking.id || selectedBooking._id, selectedBooking.playTitle)}><Ionicons name="close-circle" size={20} color="#fff" /><Text style={styles.modalCancelButtonText}>Cancel Booking</Text></TouchableOpacity>}
              <TouchableOpacity 
                style={[styles.modalTicketButton, generatingTicket && styles.modalTicketButtonDisabled, !ticketAvailable && styles.modalTicketButtonDisabled]} 
                onPress={() => { setModalVisible(false); generatePDFTicket(selectedBooking); }}
                disabled={generatingTicket || !ticketAvailable}
              >
                {generatingTicket ? <ActivityIndicator size="small" color="#fff" /> : <>
                  <Ionicons name="ticket" size={20} color="#fff" />
                  <Text style={styles.modalTicketButtonText}>{ticketAvailable ? 'Download PDF Ticket' : 'Requirements Not Met'}</Text>
                </>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderEmptyState = () => (
    <ScrollView contentContainerStyle={styles.emptyContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.emptyIllustration}><Ionicons name="ticket-outline" size={100} color="#e0e0e0" /></View>
      <Text style={styles.emptyTitle}>No Bookings Yet</Text>
      <Text style={styles.emptyText}>{userData ? `Hi ${userData.fullName || userData.name}, you haven't made any bookings yet.` : 'You haven\'t made any bookings yet.'}</Text>
      <Text style={styles.emptySubText}>Explore our amazing plays and book your tickets to experience live theater!</Text>
      <TouchableOpacity style={styles.exploreButton} onPress={() => navigation.navigate('Home')}><Ionicons name="search" size={20} color="#fff" style={styles.exploreIcon} /><Text style={styles.exploreButtonText}>Explore Plays</Text></TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={onRefresh}><Ionicons name="refresh" size={20} color="#6200EE" style={styles.refreshIcon} /><Text style={styles.secondaryButtonText}>Refresh</Text></TouchableOpacity>
    </ScrollView>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#6200EE" /><Text style={styles.loadingText}>Loading your bookings...</Text></View>;
  if (!userData) return <View style={styles.centered}><Ionicons name="lock-closed" size={60} color="#666" /><Text style={styles.loginRequiredText}>Login Required</Text><Text style={styles.loginSubText}>Please login to view your bookings</Text><TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}><Ionicons name="log-in" size={20} color="#fff" style={styles.loginIcon} /><Text style={styles.loginButtonText}>Go to Login</Text></TouchableOpacity><TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Text style={styles.backButtonText}>Go Back</Text></TouchableOpacity></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View><Text style={styles.title}>My Bookings</Text><Text style={styles.subtitle}>{userData.fullName || userData.name} • {userData.email}</Text></View>
        <TouchableOpacity style={styles.refreshHeaderButton} onPress={onRefresh}><Ionicons name="refresh" size={22} color="#6200EE" /></TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholder="Search bookings..." value={searchQuery} onChangeText={setSearchQuery} />
        {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color="#666" /></TouchableOpacity>}
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}><Text style={styles.statNumber}>{filteredBookings.length}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}><Text style={[styles.statNumber, { color: '#4CAF50' }]}>{filteredBookings.filter(b => b.paymentStatus === 'approved' && (b.status === 'approved' || b.status === 'confirmed')).length}</Text><Text style={styles.statLabel}>Ready for Ticket</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}><Text style={[styles.statNumber, { color: '#FF9800' }]}>{filteredBookings.filter(b => b.paymentStatus === 'pending' || b.status === 'pending').length}</Text><Text style={styles.statLabel}>Pending</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}><Text style={[styles.statNumber, { color: '#F44336' }]}>{filteredBookings.filter(b => b.paymentStatus === 'rejected' || b.status === 'rejected' || b.status === 'cancelled').length}</Text><Text style={styles.statLabel}>Rejected/Cancelled</Text></View>
      </View>

      <FlatList 
        data={filteredBookings} 
        keyExtractor={(item) => (item.id || item._id || Math.random()).toString()} 
        renderItem={renderBookingCard} 
        contentContainerStyle={filteredBookings.length === 0 ? styles.emptyListContent : styles.listContent} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6200EE']} tintColor="#6200EE" />} 
        ListEmptyComponent={renderEmptyState} 
        showsVerticalScrollIndicator={false} 
        ListHeaderComponent={filteredBookings.length > 0 && <Text style={styles.listHeader}>{filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found</Text>} 
      />

      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Home')}><Ionicons name="home" size={24} color="#fff" /></TouchableOpacity>
        <TouchableOpacity style={[styles.fab, styles.fabSecondary]} onPress={fetchMyBookings}><Ionicons name="refresh" size={20} color="#fff" /></TouchableOpacity>
      </View>

      {renderBookingModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingText: { marginTop: 15, fontSize: 16, color: '#666', textAlign: 'center' },
  loginRequiredText: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 10 },
  loginSubText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  loginButton: { backgroundColor: '#6200EE', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 15, minWidth: 200 },
  loginIcon: { marginRight: 8 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backButton: { paddingHorizontal: 20, paddingVertical: 10 },
  backButtonText: { color: '#666', fontSize: 14 },
  header: { padding: 20, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  refreshHeaderButton: { padding: 8, borderRadius: 20, backgroundColor: '#f0f0f0' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 15, marginVertical: 10, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
  statsBar: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 15, paddingHorizontal: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: '#eee', marginHorizontal: 5 },
  listContent: { padding: 15, paddingBottom: 30 },
  emptyListContent: { flexGrow: 1 },
  listHeader: { fontSize: 14, color: '#666', marginBottom: 15, marginLeft: 5 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 15, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  playImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  noImage: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  playInfo: { flex: 1, justifyContent: 'center', marginRight: 10 },
  playTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  venueText: { fontSize: 13, color: '#666' },
  cardBody: { padding: 16, paddingBottom: 12 },
  statusRow: { marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusIcon: { marginRight: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  detailItem: { width: '50%', marginBottom: 12 },
  detailLabel: { fontSize: 11, color: '#999', marginTop: 4, marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '500', color: '#333' },
  referenceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 8, borderRadius: 6, marginBottom: 8 },
  referenceText: { fontSize: 12, color: '#666', marginLeft: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 6, marginTop: 8 },
  infoText: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
  cardFooter: { padding: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fafafa' },
  bookingDate: { fontSize: 12, color: '#888', marginBottom: 12 },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#ffebee', borderRadius: 6, borderWidth: 1, borderColor: '#ffcdd2', flex: 1 },
  cancelButtonText: { color: '#d32f2f', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  generateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#4CAF50', borderRadius: 6, gap: 6, flex: 1 },
  generateButtonDisabled: { backgroundColor: '#9E9E9E', opacity: 0.7 },
  generateButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  viewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f3e5f5', borderRadius: 6, borderWidth: 1, borderColor: '#e1bee7', gap: 6, flex: 1 },
  viewButtonText: { color: '#6200EE', fontSize: 14, fontWeight: '500' },
  emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIllustration: { marginBottom: 30 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 12, textAlign: 'center' },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 30, maxWidth: 300 },
  exploreButton: { backgroundColor: '#6200EE', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 15, minWidth: 200 },
  exploreIcon: { marginRight: 8 },
  exploreButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  refreshIcon: { marginRight: 6 },
  secondaryButtonText: { color: '#6200EE', fontSize: 14, fontWeight: '500' },
  fabContainer: { position: 'absolute', bottom: 20, right: 20, alignItems: 'center' },
  fab: { backgroundColor: '#6200EE', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5, marginBottom: 10 },
  fabSecondary: { width: 44, height: 44, backgroundColor: '#7c4dff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  modalContent: { padding: 20 },
  modalPlayInfo: { flexDirection: 'row', marginBottom: 20 },
  modalPlayImage: { width: 80, height: 80, borderRadius: 10, marginRight: 15 },
  modalNoImage: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  modalPlayDetails: { flex: 1, justifyContent: 'center' },
  modalPlayTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  modalPlayVenue: { fontSize: 14, color: '#666', marginBottom: 8 },
  modalStatusContainer: { marginTop: 8 },
  modalStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  modalStatusText: { fontSize: 12, fontWeight: '600' },
  modalSection: { marginBottom: 25 },
  modalSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
  modalDetailRow: { flexDirection: 'row', marginBottom: 15 },
  modalDetailItem: { flex: 1, marginBottom: 15 },
  modalDetailLabel: { fontSize: 12, color: '#666', marginTop: 5, marginBottom: 4 },
  modalDetailValue: { fontSize: 15, fontWeight: '500', color: '#333' },
  modalTotalPrice: { fontSize: 18, fontWeight: 'bold', color: '#6200EE' },
  qrContainer: { alignItems: 'center', backgroundColor: '#f8f9fa', padding: 20, borderRadius: 10, marginTop: 10 },
  qrLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 10, marginBottom: 5 },
  qrNote: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 5, fontStyle: 'italic' },
  paymentStatusBox: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, borderWidth: 2, marginTop: 10 },
  paymentStatusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  paymentStatusTitle: { fontSize: 14, fontWeight: '600' },
  paymentStatusValue: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  paymentStatusNote: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  modalActions: { flexDirection: 'row', padding: 20, paddingTop: 0, gap: 10 },
  modalCancelButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, backgroundColor: '#F44336', borderRadius: 10, gap: 8 },
  modalCancelButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalTicketButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, backgroundColor: '#6200EE', borderRadius: 10, gap: 8 },
  modalTicketButtonDisabled: { backgroundColor: '#9E9E9E', opacity: 0.7 },
  modalTicketButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});

export default MyBookingsScreen;