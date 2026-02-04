import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, RefreshControl, TouchableOpacity, ScrollView, TextInput, Modal, Animated, Easing } from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const API_BASE_URL = "http://192.168.0.103:5000";

export default function TicketsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [actionType, setActionType] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const fetchTickets = async () => {
    try {
      setError(null);
      const res = await axios.get(`${API_BASE_URL}/api/bookings`);
      if (res.data?.success && res.data.bookings) {
        setTickets(res.data.bookings);
      } else {
        setTickets([]);
        setError("Unexpected response format");
      }
    } catch (error) {
      console.error("Fetch error:", error.message);
      setError("Failed to load tickets. Please check your connection.");
      Alert.alert("Error", "Failed to load tickets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  useEffect(() => { fetchTickets(); }, []);
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isSearchVisible ? 1 : 0,
      duration: isSearchVisible ? 300 : 200,
      easing: isSearchVisible ? Easing.out(Easing.ease) : Easing.in(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [isSearchVisible]);

  const filterTickets = () => {
    return tickets.filter(ticket => {
      if (selectedTab === "pending") return ticket.paymentStatus === "pending";
      if (selectedTab === "approved") return ticket.paymentStatus === "approved";
      if (selectedTab === "rejected") return ticket.paymentStatus === "rejected";
      if (selectedTab === "confirmed") return ticket.status === "confirmed";
      if (selectedTab === "cancelled") return ticket.status === "cancelled";
      return true;
    });
  };

  const searchTickets = (ticketsToSearch) => {
    if (!searchQuery.trim()) return ticketsToSearch;
    const query = searchQuery.toLowerCase().trim();
    return ticketsToSearch.filter(ticket => 
      (ticket.customerName && ticket.customerName.toLowerCase().includes(query)) ||
      (ticket.customerEmail && ticket.customerEmail.toLowerCase().includes(query)) ||
      (ticket.playTitle && ticket.playTitle.toLowerCase().includes(query)) ||
      (ticket.bookingReference && ticket.bookingReference.toLowerCase().includes(query))
    );
  };

  const filteredTickets = searchTickets(filterTickets());

  const updatePaymentStatus = async (ticketId, status) => {
    try {
      setUpdatingStatus(true);
      const response = await axios.put(`${API_BASE_URL}/api/bookings/${ticketId}`, { paymentStatus: status });
      if (response.data.success) {
        Alert.alert("Success", `Payment ${status} successfully`);
        setTickets(prevTickets => prevTickets.map(ticket => 
          ticket.id === ticketId || ticket._id === ticketId ? { ...ticket, paymentStatus: status } : ticket
        ));
        setModalVisible(false);
      } else {
        Alert.alert("Error", response.data.msg || "Failed to update status");
      }
    } catch (error) {
      console.error("Update status error:", error.message);
      Alert.alert("Error", "Failed to update payment status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleStatusAction = (ticket, action) => {
    setSelectedTicket(ticket);
    setActionType(action);
    setModalVisible(true);
  };

  const confirmAction = () => {
    if (selectedTicket && actionType) {
      updatePaymentStatus(selectedTicket.id || selectedTicket._id, actionType);
    }
  };

  const getStatusColor = (paymentStatus, bookingStatus) => {
    switch (paymentStatus) {
      case "approved": return "#10B981";
      case "rejected": return "#EF4444";
      case "pending": return "#F59E0B";
      default: 
        switch (bookingStatus) {
          case "confirmed": return "#10B981";
          case "cancelled": return "#EF4444";
          default: return "#6B7280";
        }
    }
  };

  const getStatusText = (paymentStatus, bookingStatus) => {
    if (paymentStatus) return paymentStatus.toUpperCase();
    return bookingStatus ? bookingStatus.toUpperCase() : "UNKNOWN";
  };

  const formatSeats = (allocatedSeats) => {
    if (!allocatedSeats) return "N/A";
    if (Array.isArray(allocatedSeats)) {
      if (allocatedSeats.length > 0) {
        if (typeof allocatedSeats[0] === 'string') return allocatedSeats.join(", ");
        if (typeof allocatedSeats[0] === 'object') return allocatedSeats.map(seat => seat.number || seat.id || "Unknown").join(", ");
      }
      return allocatedSeats.join(", ");
    }
    return "N/A";
  };

  const renderTicket = ({ item }) => {
    const seats = formatSeats(item.allocatedSeats);
    const playDate = item.playDate ? new Date(item.playDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : "Date not set";
    const bookingDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
    const totalPrice = item.totalPrice || 0;
    const quantity = item.quantity || 0;
    const ticketType = item.ticketType || "regular";
    const statusColor = getStatusColor(item.paymentStatus, item.status);
    const statusText = getStatusText(item.paymentStatus, item.status);
    const bookingRef = item.bookingReference || `REF-${item.id?.substring(0, 8) || "N/A"}`;
    const paymentMethod = item.paymentMethod || "Unknown";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.playTitle} numberOfLines={1}>{item.playTitle || "Untitled Play"}</Text>
            <Text style={styles.bookingRef}>Ref: {bookingRef}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.customerSection}>
          <View style={styles.customerRow}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.customerLabel}>Name:</Text>
            <Text style={styles.customerValue}>{item.customerName || "Customer"}</Text>
          </View>
          <View style={styles.customerRow}>
            <Ionicons name="mail-outline" size={16} color="#666" />
            <Text style={styles.customerLabel}>Email:</Text>
            <Text style={styles.customerValue}>{item.customerEmail || "Email not available"}</Text>
          </View>
          {item.customerPhone ? (
            <View style={styles.customerRow}>
              <Ionicons name="call-outline" size={16} color="#666" />
              <Text style={styles.customerLabel}>Phone:</Text>
              <Text style={styles.customerValue}>{item.customerPhone}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailLabel}>Event:</Text>
            <Text style={styles.detailValue}>{playDate}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="ticket-outline" size={16} color="#666" />
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{ticketType.toUpperCase()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.detailLabel}>Qty:</Text>
            <Text style={styles.detailValue}>{quantity} ticket{quantity !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.detailLabel}>Seats:</Text>
            <Text style={styles.detailValue}>{seats}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.detailLabel}>Total:</Text>
            <Text style={styles.detailValue}>KES {totalPrice.toLocaleString()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={16} color="#666" />
            <Text style={styles.detailLabel}>Payment:</Text>
            <Text style={styles.detailValue}>{paymentMethod.toUpperCase()}</Text>
          </View>
        </View>

        {item.paymentStatus === "pending" && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => handleStatusAction(item, "approved")}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => handleStatusAction(item, "rejected")}>
              <Ionicons name="close-circle" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.paymentStatus === "approved" && (
          <View style={styles.statusIndicator}>
            <Ionicons name="checkmark-done-circle" size={18} color="#10B981" />
            <Text style={styles.statusIndicatorText}>Payment Approved</Text>
          </View>
        )}
        {item.paymentStatus === "rejected" && (
          <View style={styles.statusIndicator}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.statusIndicatorText}>Payment Rejected</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.bookingDate}>Booked on {bookingDate}</Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="ticket-outline" size={80} color="#D1D5DB" />
      <Text style={styles.emptyStateTitle}>No Tickets Found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery ? `No results for "${searchQuery}"` : selectedTab !== "all" ? `No ${selectedTab} tickets found` : "No bookings available"}
      </Text>
      {(searchQuery || selectedTab !== "all") && (
        <TouchableOpacity style={styles.clearButton} onPress={() => { setSearchQuery(""); setSelectedTab("all"); }}>
          <Text style={styles.clearButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderTabButton = (tab, label, icon) => (
    <TouchableOpacity style={[styles.tabButton, selectedTab === tab && styles.tabButtonActive]} onPress={() => setSelectedTab(tab)}>
      <Ionicons name={icon} size={18} color={selectedTab === tab ? "#fff" : "#6B7280"} style={styles.tabIcon} />
      <Text style={[styles.tabButtonText, selectedTab === tab && styles.tabButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const searchHeight = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 60] });

  if (loading && !refreshing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Loading tickets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Tickets Management</Text>
            <Text style={styles.headerSubtitle}>{filteredTickets.length} of {tickets.length} tickets</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={() => setIsSearchVisible(!isSearchVisible)}>
              <Ionicons name={isSearchVisible ? "close" : "search"} size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={fetchTickets}>
              <Ionicons name="refresh" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Animated.View style={[styles.searchContainer, { height: searchHeight }]}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="Search by name, email, play, or reference..." placeholderTextColor="#999" value={searchQuery} onChangeText={setSearchQuery} autoCapitalize="none" autoCorrect={false} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={styles.tabsContent}>
        {renderTabButton("all", "All", "list")}
        {renderTabButton("pending", "Pending", "time")}
        {renderTabButton("approved", "Approved", "checkmark-circle")}
        {renderTabButton("rejected", "Rejected", "close-circle")}
        {renderTabButton("confirmed", "Confirmed", "ticket")}
        {renderTabButton("cancelled", "Cancelled", "close-circle-outline")}
      </ScrollView>

      <FlatList
        data={filteredTickets}
        keyExtractor={(item) => item.id || item._id || Math.random().toString()}
        renderItem={renderTicket}
        ListEmptyComponent={renderEmptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6200EE"]} tintColor="#6200EE" />}
        contentContainerStyle={[styles.listContent, filteredTickets.length === 0 && styles.emptyListContent]}
        showsVerticalScrollIndicator={false}
      />

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name={actionType === "approved" ? "checkmark-circle" : "alert-circle"} size={40} color={actionType === "approved" ? "#10B981" : "#EF4444"} />
              <Text style={styles.modalTitle}>{actionType === "approved" ? "Approve Payment" : "Reject Payment"}</Text>
              <Text style={styles.modalSubtitle}>{actionType === "approved" ? "Are you sure you want to approve this payment?" : "Are you sure you want to reject this payment?"}</Text>
            </View>

            {selectedTicket && (
              <View style={styles.modalTicketInfo}>
                <Text style={styles.modalTicketTitle}>{selectedTicket.playTitle}</Text>
                <Text style={styles.modalTicketDetail}>Customer: {selectedTicket.customerName}</Text>
                <Text style={styles.modalTicketDetail}>Amount: KES {selectedTicket.totalPrice?.toLocaleString()}</Text>
                <Text style={styles.modalTicketDetail}>Reference: {selectedTicket.bookingReference}</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => setModalVisible(false)} disabled={updatingStatus}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, actionType === "approved" ? styles.modalApproveButton : styles.modalRejectButton]} onPress={confirmAction} disabled={updatingStatus}>
                {updatingStatus ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name={actionType === "approved" ? "checkmark" : "close"} size={20} color="#fff" style={styles.modalButtonIcon} />
                    <Text style={styles.modalButtonText}>{actionType === "approved" ? "Approve" : "Reject"}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: { backgroundColor: "#6200EE", padding: 20, paddingTop: 50, paddingBottom: 15 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.9)", marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  headerButton: { marginLeft: 15, padding: 4 },
  searchContainer: { backgroundColor: "#fff", overflow: "hidden" },
  searchInputContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: "#333", paddingVertical: 4 },
  tabsContainer: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tabsContent: { paddingHorizontal: 16, paddingVertical: 8 },
  tabButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, borderRadius: 20, backgroundColor: "#F3F4F6" },
  tabButtonActive: { backgroundColor: "#6200EE" },
  tabIcon: { marginRight: 6 },
  tabButtonText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  tabButtonTextActive: { color: "#fff" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8f9fa" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },
  listContent: { padding: 16 },
  emptyListContent: { flexGrow: 1 },
  card: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: "#f0f0f0" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  playTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937", marginBottom: 4 },
  bookingRef: { fontSize: 12, color: "#6B7280", fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 100, alignItems: "center" },
  statusText: { fontSize: 12, fontWeight: "bold", color: "#fff", letterSpacing: 0.5 },
  customerSection: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  customerRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  customerLabel: { fontSize: 14, color: "#6B7280", marginLeft: 8, marginRight: 8, width: 50 },
  customerValue: { fontSize: 14, color: "#1F2937", fontWeight: "500", flex: 1 },
  detailsContainer: { marginBottom: 16 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  detailLabel: { fontSize: 14, color: "#6B7280", marginLeft: 8, marginRight: 8, width: 60 },
  detailValue: { fontSize: 14, color: "#1F2937", fontWeight: "500", flex: 1 },
  actionButtons: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, gap: 12 },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, gap: 8 },
  approveButton: { backgroundColor: "#10B981" },
  rejectButton: { backgroundColor: "#EF4444" },
  actionButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  statusIndicator: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 16, backgroundColor: "#F3F4F6", borderRadius: 12, marginBottom: 16, gap: 8 },
  statusIndicatorText: { fontSize: 14, fontWeight: "600" },
  cardFooter: { paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  bookingDate: { fontSize: 12, color: "#9CA3AF", textAlign: "right" },
  emptyState: { alignItems: "center", justifyContent: "center", padding: 40 },
  emptyStateTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937", marginTop: 16, marginBottom: 8 },
  emptyStateText: { fontSize: 16, color: "#6B7280", textAlign: "center", marginBottom: 24, lineHeight: 22 },
  clearButton: { backgroundColor: "#6200EE", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  clearButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400 },
  modalHeader: { alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937", marginTop: 12, marginBottom: 8 },
  modalSubtitle: { fontSize: 16, color: "#6B7280", textAlign: "center", lineHeight: 22 },
  modalTicketInfo: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 16, marginBottom: 24 },
  modalTicketTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 8 },
  modalTicketDetail: { fontSize: 14, color: "#6B7280", marginBottom: 4 },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12, gap: 8 },
  modalCancelButton: { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  modalCancelButtonText: { color: "#6B7280", fontSize: 16, fontWeight: "600" },
  modalApproveButton: { backgroundColor: "#10B981" },
  modalRejectButton: { backgroundColor: "#EF4444" },
  modalButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  modalButtonIcon: { marginRight: 4 },
});