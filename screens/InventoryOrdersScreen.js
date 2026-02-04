import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

const API_BASE_URL = "http://192.168.0.103:5000";

export default function FinanceOrdersScreen() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentProcessingModal, setPaymentProcessingModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paymentMethod: "Bank Transfer",
    transactionId: "",
    amountPaid: "",
    notes: ""
  });
  const [filterStatus, setFilterStatus] = useState("All"); // New state for filter

  const fetchOrders = async (status = "All") => {
    try {
      setLoading(true);
      if (status === "All") {
        // Fetch all orders with any payment status except Pending
        const res = await axios.get(`${API_BASE_URL}/api/orders`);
        const allOrders = res.data.orders || [];
        // Filter out orders that don't have payment submitted or are not in payment workflow
        const filteredOrders = allOrders.filter(order => 
          order.payment && order.payment.status && 
          order.payment.status !== "Pending" && 
          order.status !== "Payment Pending"
        );
        setOrders(filteredOrders);
      } else {
        // Fetch orders by specific payment status
        const res = await axios.get(`${API_BASE_URL}/api/orders/payment-status/${status}`);
        setOrders(res.data.orders || []);
      }
    } catch (error) {
      console.log(error.message);
      Alert.alert("Error", "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(filterStatus);
  }, [filterStatus]);

  const handleApprovePayment = (order) => {
    setSelectedOrder(order);
    Alert.alert(
      "Approve Payment Request",
      `Approve payment of KES ${order.payment?.amountPaid || order.totalCost} for ${order.itemName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              setProcessingPayment(true);
              const userData = {
                userId: "finance_user_001",
                userName: "Finance Officer"
              };
              const response = await axios.put(
                `${API_BASE_URL}/api/orders/${order._id}/approve-payment`,
                userData
              );
              Alert.alert("Success", "Payment request approved");
              // Refresh orders to update the status
              fetchOrders(filterStatus);
              // Show processing modal for next step
              setPaymentProcessingModal(true);
              setPaymentData({
                paymentMethod: order.payment?.paymentMethod || "Bank Transfer",
                transactionId: "",
                amountPaid: order.payment?.amountPaid || order.totalCost,
                notes: ""
              });
            } catch (error) {
              console.log("Approve error:", error.response?.data || error.message);
              Alert.alert("Error", error.response?.data?.message || "Failed to approve payment");
            } finally {
              setProcessingPayment(false);
            }
          }
        }
      ]
    );
  };

  const handleRejectPayment = (order) => {
    Alert.alert(
      "Reject Payment Request",
      `Reject payment request for ${order.itemName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await axios.put(
                `${API_BASE_URL}/api/orders/${order._id}/reject-payment`,
                {
                  userId: "finance_user_001",
                  userName: "Finance Officer",
                  reason: "Payment request rejected by finance department"
                }
              );
              Alert.alert("Success", "Payment request rejected");
              fetchOrders(filterStatus);
            } catch (error) {
              console.log("Reject error:", error.response?.data || error.message);
              Alert.alert("Error", error.response?.data?.message || "Failed to reject payment");
            }
          }
        }
      ]
    );
  };

  const handleProcessPayment = async () => {
    if (!selectedOrder) return;
    
    if (!paymentData.paymentMethod) {
      Alert.alert("Validation Error", "Please select a payment method");
      return;
    }
    
    if (paymentData.paymentMethod !== "Cash" && !paymentData.transactionId) {
      Alert.alert("Validation Error", "Please enter a transaction/reference ID");
      return;
    }

    try {
      setProcessingPayment(true);
      const paymentDetails = {
        userId: "finance_user_001",
        userName: "Finance Officer",
        paymentMethod: paymentData.paymentMethod,
        transactionId: paymentData.transactionId,
        amountPaid: paymentData.amountPaid,
        notes: paymentData.notes
      };

      const response = await axios.put(
        `${API_BASE_URL}/api/orders/${selectedOrder._id}/process-payment`,
        paymentDetails
      );
      
      Alert.alert("Success", "Payment processed successfully and marked as paid");
      setPaymentProcessingModal(false);
      setPaymentData({
        paymentMethod: "Bank Transfer",
        transactionId: "",
        amountPaid: "",
        notes: ""
      });
      setSelectedOrder(null);
      fetchOrders(filterStatus);
    } catch (error) {
      console.log("Process payment error:", error.response?.data || error.message);
      Alert.alert("Error", error.response?.data?.message || "Failed to process payment");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleMarkAsPaid = (order) => {
    Alert.alert(
      "Mark as Paid",
      `Mark this payment as fully paid? This will close the order.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark as Paid",
          onPress: async () => {
            try {
              setProcessingPayment(true);
              const response = await axios.put(
                `${API_BASE_URL}/api/orders/${order._id}/mark-paid`,
                {
                  paymentMethod: order.payment?.paymentMethod || "Bank Transfer",
                  transactionId: order.payment?.transactionId || "",
                  notes: "Marked as paid by finance department"
                }
              );
              Alert.alert("Success", "Order marked as paid");
              fetchOrders(filterStatus);
            } catch (error) {
              console.log("Mark paid error:", error.response?.data || error.message);
              Alert.alert("Error", error.response?.data?.message || "Failed to mark as paid");
            } finally {
              setProcessingPayment(false);
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (amount) => {
    return `KES ${parseFloat(amount || 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "Submitted": return "#f39c12";
      case "Approved": return "#3498db";
      case "Rejected": return "#e74c3c";
      case "Paid": return "#2ecc71";
      default: return "#f39c12";
    }
  };

  const getStatusCount = (status) => {
    return orders.filter(order => order.payment?.status === status).length;
  };

  const renderOrder = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.item?.name || item.itemName || "Unknown Item"}</Text>
        <Text style={styles.orderId}>Order ID: {item._id?.slice(-8)}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Ionicons name="cube-outline" size={16} color="#666" />
        <Text style={styles.detailText}>Quantity: {item.quantity}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Ionicons name="business-outline" size={16} color="#666" />
        <Text style={styles.detailText}>Supplier: {item.supplier?.fullName || item.supplierName || "Unknown"}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Ionicons name="calculator-outline" size={16} color="#333" />
        <Text style={styles.totalCost}>Total Amount: {formatCurrency(item.totalCost || item.quantity * item.unitPrice)}</Text>
      </View>

      <View style={styles.paymentSection}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.detailText}>Submitted by: {item.payment?.submittedBy?.name || item.payment?.submittedByName || "Inventory User"}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.detailText}>Submitted on: {formatDate(item.payment?.submittedAt)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={16} color="#666" />
          <Text style={styles.detailText}>Method: {item.payment?.paymentMethod || "Bank Transfer"}</Text>
        </View>
        
        {item.payment?.approvedBy && (
          <View style={styles.detailRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#3498db" />
            <Text style={styles.detailText}>Approved by: {item.payment?.approvedBy?.name || "Finance"}</Text>
          </View>
        )}
        
        {item.payment?.processedBy && (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#2ecc71" />
            <Text style={styles.detailText}>Processed by: {item.payment?.processedBy?.name || "Finance"}</Text>
          </View>
        )}
        
        {item.payment?.notes && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Notes: {item.payment.notes}</Text>
          </View>
        )}
      </View>

      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.payment?.status) }]}>
        <Text style={styles.statusText}>
          {item.payment?.status?.toUpperCase() || "SUBMITTED"}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        {item.payment?.status === "Submitted" && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]} 
              onPress={() => handleApprovePayment(item)}
              disabled={processingPayment}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]} 
              onPress={() => handleRejectPayment(item)}
              disabled={processingPayment}
            >
              <Ionicons name="close-circle-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}

        {item.payment?.status === "Approved" && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, styles.processButton]} 
              onPress={() => {
                setSelectedOrder(item);
                setPaymentProcessingModal(true);
                setPaymentData({
                  paymentMethod: item.payment?.paymentMethod || "Bank Transfer",
                  transactionId: "",
                  amountPaid: item.payment?.amountPaid || item.totalCost,
                  notes: ""
                });
              }}
              disabled={processingPayment}
            >
              <Ionicons name="cash-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>Process Payment</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.markPaidButton]} 
              onPress={() => handleMarkAsPaid(item)}
              disabled={processingPayment}
            >
              <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>Mark as Paid</Text>
            </TouchableOpacity>
          </>
        )}

        {item.payment?.status === "Paid" && (
          <View style={styles.paidStatus}>
            <Ionicons name="checkmark-done-circle" size={24} color="#2ecc71" />
            <Text style={styles.paidText}>Payment Completed</Text>
            <Text style={styles.paidDate}>
              {item.payment?.processedAt ? `Processed on: ${formatDate(item.payment.processedAt)}` : 
               item.payment?.paymentDate ? `Paid on: ${formatDate(item.payment.paymentDate)}` : ""}
            </Text>
            {item.payment?.transactionId && (
              <Text style={styles.paidDate}>Transaction ID: {item.payment.transactionId}</Text>
            )}
          </View>
        )}

        {item.payment?.status === "Rejected" && (
          <View style={styles.rejectedStatus}>
            <Ionicons name="alert-circle-outline" size={24} color="#e74c3c" />
            <Text style={styles.rejectedText}>Payment Rejected</Text>
            <Text style={styles.rejectedDate}>
              {item.payment?.rejectedAt ? `Rejected on: ${formatDate(item.payment.rejectedAt)}` : ""}
            </Text>
            {item.payment?.rejectionReason && (
              <Text style={styles.rejectedDate}>Reason: {item.payment.rejectionReason}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {["All", "Submitted", "Approved", "Paid", "Rejected"].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterTab,
              filterStatus === status && styles.filterTabActive
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[
              styles.filterTabText,
              filterStatus === status && styles.filterTabTextActive
            ]}>
              {status} {status !== "All" && `(${getStatusCount(status)})`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Finance - Payment Management</Text>
          <Text style={styles.headerSubtitle}>All payment requests and statuses</Text>
        </View>

        {renderFilterTabs()}

        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>
              {filterStatus === "All" 
                ? "No payment requests found" 
                : `No ${filterStatus.toLowerCase()} payments`}
            </Text>
            <Text style={styles.emptySubtext}>
              {filterStatus === "All" 
                ? "All payments have been processed or no requests submitted yet" 
                : "Try selecting a different filter"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item._id}
            renderItem={renderOrder}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}

        <Modal visible={paymentProcessingModal} animationType="slide" transparent={true} onRequestClose={() => setPaymentProcessingModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Process Payment</Text>
                <TouchableOpacity onPress={() => setPaymentProcessingModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {selectedOrder && (
                  <>
                    <View style={styles.paymentSummary}>
                      <Text style={styles.paymentSummaryTitle}>Order Details</Text>
                      <View style={styles.paymentDetailRow}>
                        <Text style={styles.paymentDetailLabel}>Item:</Text>
                        <Text style={styles.paymentDetailValue}>{selectedOrder.item?.name || selectedOrder.itemName}</Text>
                      </View>
                      <View style={styles.paymentDetailRow}>
                        <Text style={styles.paymentDetailLabel}>Supplier:</Text>
                        <Text style={styles.paymentDetailValue}>{selectedOrder.supplier?.fullName || selectedOrder.supplierName}</Text>
                      </View>
                      <View style={styles.paymentDetailRow}>
                        <Text style={styles.paymentDetailLabel}>Amount Due:</Text>
                        <Text style={styles.paymentDetailValue}>{formatCurrency(selectedOrder.totalCost || selectedOrder.quantity * selectedOrder.unitPrice)}</Text>
                      </View>
                      <View style={styles.paymentDetailRow}>
                        <Text style={styles.paymentDetailLabel}>Payment Status:</Text>
                        <Text style={[styles.paymentDetailValue, { color: getStatusColor(selectedOrder.payment?.status) }]}>
                          {selectedOrder.payment?.status || "Submitted"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Payment Method *</Text>
                      <View style={styles.pickerContainer}>
                        <Picker selectedValue={paymentData.paymentMethod} style={styles.picker} onValueChange={(value) => setPaymentData({...paymentData, paymentMethod: value})}>
                          <Picker.Item label="Bank Transfer" value="Bank Transfer" />
                          <Picker.Item label="MPesa" value="MPesa" />
                          <Picker.Item label="Cheque" value="Cheque" />
                          <Picker.Item label="Cash" value="Cash" />
                          <Picker.Item label="Other" value="Other" />
                        </Picker>
                      </View>
                    </View>

                    {paymentData.paymentMethod !== "Cash" && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Transaction/Reference ID *</Text>
                        <View style={styles.inputWithIcon}>
                          <Ionicons name="card-outline" size={20} color="#666" style={styles.inputIcon} />
                          <TextInput 
                            style={styles.input} 
                            placeholder="Enter transaction ID or reference number" 
                            value={paymentData.transactionId} 
                            onChangeText={(text) => setPaymentData({...paymentData, transactionId: text})} 
                          />
                        </View>
                      </View>
                    )}

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Amount Paid (KES) *</Text>
                      <View style={styles.inputWithIcon}>
                        <Ionicons name="cash-outline" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput 
                          style={styles.input} 
                          placeholder="Enter amount paid" 
                          keyboardType="numeric"
                          value={paymentData.amountPaid.toString()} 
                          onChangeText={(text) => setPaymentData({...paymentData, amountPaid: text})} 
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Payment Notes (Optional)</Text>
                      <View style={styles.inputWithIcon}>
                        <Ionicons name="document-text-outline" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput 
                          style={[styles.input, styles.textArea]} 
                          placeholder="Add any payment notes..." 
                          value={paymentData.notes} 
                          onChangeText={(text) => setPaymentData({...paymentData, notes: text})} 
                          multiline 
                          numberOfLines={3} 
                        />
                      </View>
                    </View>

                    <View style={styles.infoBox}>
                      <Ionicons name="information-circle-outline" size={20} color="#3498db" />
                      <Text style={styles.infoText}>
                        This will process the payment and mark the order as paid. Ensure payment has been successfully made before submitting.
                      </Text>
                    </View>
                  </>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setPaymentProcessingModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.createButton, processingPayment && styles.createButtonDisabled]} 
                  onPress={handleProcessPayment}
                  disabled={processingPayment}
                >
                  {processingPayment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                      <Text style={styles.createButtonText}>Process & Mark as Paid</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee", elevation: 2 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#333" },
  headerSubtitle: { fontSize: 14, color: "#666", marginTop: 4 },
  filterContainer: { backgroundColor: "#fff", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  filterScroll: { paddingHorizontal: 16 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderRadius: 20, backgroundColor: "#f5f5f5" },
  filterTabActive: { backgroundColor: "#6200EE" },
  filterTabText: { fontSize: 14, color: "#666", fontWeight: "500" },
  filterTabTextActive: { color: "#fff" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },
  listContainer: { padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "bold", color: "#333", flex: 1 },
  orderId: { fontSize: 12, color: "#666", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
  detailText: { fontSize: 15, color: "#666" },
  totalCost: { fontSize: 16, fontWeight: "bold", color: "#333" },
  paymentSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#eee" },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 8 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 10 },
  statusText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  actionButtons: { marginTop: 12, flexDirection: "row", gap: 8 },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 8, gap: 8 },
  approveButton: { backgroundColor: "#2ecc71" },
  rejectButton: { backgroundColor: "#e74c3c" },
  processButton: { backgroundColor: "#3498db" },
  markPaidButton: { backgroundColor: "#9b59b6" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  paidStatus: { flex: 1, alignItems: "center", padding: 12, backgroundColor: "#e8f6f3", borderRadius: 8 },
  paidText: { fontSize: 14, fontWeight: "600", color: "#2ecc71", marginTop: 4 },
  paidDate: { fontSize: 12, color: "#666", marginTop: 2, textAlign: "center" },
  rejectedStatus: { flex: 1, alignItems: "center", padding: 12, backgroundColor: "#fde8e8", borderRadius: 8 },
  rejectedText: { fontSize: 14, fontWeight: "600", color: "#e74c3c", marginTop: 4 },
  rejectedDate: { fontSize: 12, color: "#666", marginTop: 2, textAlign: "center" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyText: { fontSize: 18, color: "#777", fontWeight: "600", marginTop: 16, textAlign: "center" },
  emptySubtext: { fontSize: 14, color: "#aaa", marginTop: 8, textAlign: "center", paddingHorizontal: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#eee" },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  modalContent: { padding: 20, maxHeight: 500 },
  paymentSummary: { backgroundColor: "#f8f9fa", borderRadius: 12, padding: 16, marginBottom: 20 },
  paymentSummaryTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 12 },
  paymentDetailRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  paymentDetailLabel: { fontSize: 14, color: "#666", flex: 1 },
  paymentDetailValue: { fontSize: 14, color: "#333", fontWeight: "500", flex: 2, textAlign: "right" },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 8 },
  pickerContainer: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, backgroundColor: "#f9f9f9", overflow: "hidden" },
  picker: { height: 50 },
  inputWithIcon: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ddd", borderRadius: 8, backgroundColor: "#f9f9f9", overflow: "hidden" },
  inputIcon: { paddingHorizontal: 16 },
  input: { flex: 1, padding: 12, fontSize: 16, color: "#333" },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 16, backgroundColor: "#e8f4fd", borderRadius: 8, marginTop: 10 },
  infoText: { flex: 1, fontSize: 14, color: "#3498db" },
  modalFooter: { flexDirection: "row", padding: 20, borderTopWidth: 1, borderTopColor: "#eee", gap: 12 },
  cancelButton: { flex: 1, padding: 16, backgroundColor: "#f5f5f5", borderRadius: 8, alignItems: "center" },
  cancelButtonText: { color: "#666", fontSize: 16, fontWeight: "600" },
  createButton: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, backgroundColor: "#6200EE", borderRadius: 8 },
  createButtonDisabled: { backgroundColor: "#b39ddb", opacity: 0.7 },
  createButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" }
});