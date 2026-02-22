// OrderScreen.js - UPDATED WITH PAYMENT SUBMISSION FUNCTIONALITY
import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, ScrollView,
  KeyboardAvoidingView, Platform
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

const API = "https://fanaka-server-1.onrender.com";

export default function OrderScreen() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [newOrder, setNewOrder] = useState({
    item: "", itemName: "", supplier: "", supplierName: "",
    quantity: "", unitPrice: "", totalCost: ""
  });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/orders`);
      setOrders(res.data.orders || []);
    } catch (err) {
      console.log("Error fetching orders:", err.message);
      Alert.alert("Error", "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API}/api/items`);
      setItems(res.data || []);
    } catch (err) {
      console.log("Error fetching items:", err.message);
      Alert.alert("Error", "Failed to load items");
      setItems([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(`${API}/api/employees/department/supplier`);
      setSuppliers(res.data || []);
    } catch (err) {
      console.log("Error fetching suppliers:", err.message);
      Alert.alert("Error", "Failed to load suppliers");
      setSuppliers([]);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchItems();
    fetchSuppliers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
    fetchItems();
  };

  const approveOrder = async (id) => {
    try {
      await axios.put(`${API}/api/orders/${id}/approve`);
      Alert.alert("Success", "Order approved successfully");
      fetchOrders();
    } catch (err) {
      console.log("Error approving order:", err.message);
      Alert.alert("Error", "Failed to approve order");
    }
  };

  const markAsDelivered = async (id) => {
    try {
      Alert.alert("Mark as Delivered", "Has this order been delivered?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Delivered",
          onPress: async () => {
            try {
              await axios.put(`${API}/api/orders/${id}/deliver`);
              Alert.alert("Success", "Order marked as delivered");
              fetchOrders();
            } catch (err) {
              Alert.alert("Error", "Failed to mark as delivered");
            }
          }
        }
      ]);
    } catch (err) {
      Alert.alert("Error", "Failed to update order");
    }
  };

  const markAsReceived = async (id) => {
    try {
      Alert.alert(
        "Confirm Receipt",
        "Mark this order as received in inventory?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mark Received",
            onPress: async () => {
              try {
                await axios.put(`${API}/api/orders/${id}/receive`);
                Alert.alert("Success", "Order marked as received. Ready for payment submission.");
                fetchOrders();
                fetchItems();
              } catch (err) {
                console.log("Error marking as received:", err.message);
                Alert.alert("Error", err.response?.data?.message || "Failed to mark order as received");
              }
            }
          }
        ]
      );
    } catch (err) {
      console.log("Error:", err.message);
      Alert.alert("Error", "Failed to update order status");
    }
  };

  const submitPaymentRequest = (order) => {
    try {
      setSelectedOrder(order);
      setPaymentModalVisible(true);
    } catch (err) {
      Alert.alert("Error", "Failed to open payment form");
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedOrder) return;
    
    try {
      // In a real app, you would get user ID from auth context
      const userId = "current_user_id";
      const userName = "Inventory User";
      
      const paymentRequest = {
        userId,
        userName,
        paymentMethod: "Bank Transfer", // Default method, finance can change if needed
        amount: selectedOrder.totalCost || (selectedOrder.quantity * selectedOrder.unitPrice),
        notes: "Payment request submitted by inventory department"
      };

      await axios.put(`${API}/api/orders/${selectedOrder._id}/submit-payment`, paymentRequest);
      
      Alert.alert("Success", "Payment request submitted to Finance Department for approval and processing.");
      setPaymentModalVisible(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      console.log("Submit payment error:", err.message);
      Alert.alert("Error", err.response?.data?.message || "Failed to submit payment request");
    }
  };

  const calcTotal = (qty, cost) => {
    const q = parseFloat(qty) || 0;
    const c = parseFloat(cost) || 0;
    const total = (q * c).toFixed(2);
    setNewOrder(prev => ({ ...prev, totalCost: total }));
  };

  const createOrder = async () => {
    const { item, supplier, quantity, unitPrice } = newOrder;
    if (!item || !supplier || !quantity || !unitPrice) {
      Alert.alert("Validation Error", "Please fill all required fields");
      return;
    }
    if (parseFloat(quantity) <= 0) {
      Alert.alert("Validation Error", "Quantity must be greater than 0");
      return;
    }
    if (parseFloat(unitPrice) <= 0) {
      Alert.alert("Validation Error", "Unit price must be greater than 0");
      return;
    }

    try {
      setIsCreating(true);
      const orderData = {
        item: item,
        supplier: supplier,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice)
      };

      const response = await axios.post(`${API}/api/orders`, orderData);
      
      Alert.alert("Success", "Order created successfully");
      setModalVisible(false);
      resetForm();
      fetchOrders();
    } catch (err) {
      console.log("Create order error:", err.response?.data || err.message);
      Alert.alert("Error", err.response?.data?.message || "Failed to create order");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setNewOrder({
      item: "", itemName: "", supplier: "", supplierName: "",
      quantity: "", unitPrice: "", totalCost: ""
    });
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
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const renderOrder = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.itemHeader}>
          <Text style={styles.title}>{item.item?.name || item.itemName || "Unknown Item"}</Text>
          <Text style={styles.orderId}>ID: {item._id?.slice(-6)}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      
      <View style={styles.detailRow}>
        <Ionicons name="business-outline" size={16} color="#666" />
        <Text style={styles.detailText}>
          Supplier: {item.supplier?.fullName || item.supplier || "Unknown"}
        </Text>
      </View>
      
      <View style={styles.detailRow}>
        <Ionicons name="cube-outline" size={16} color="#666" />
        <Text style={styles.detailText}>Quantity: {item.quantity}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Ionicons name="pricetag-outline" size={16} color="#666" />
        <Text style={styles.detailText}>Unit Price: {formatCurrency(item.unitPrice)}</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Ionicons name="calculator-outline" size={16} color="#333" />
        <Text style={styles.totalCost}>Total: {formatCurrency(item.totalCost || item.quantity * item.unitPrice)}</Text>
      </View>

      {item.deliveryDate && (
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.detailText}>Delivered: {formatDate(item.deliveryDate)}</Text>
        </View>
      )}

      {item.receivedAt && (
        <View style={styles.detailRow}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#27ae60" />
          <Text style={[styles.detailText, { color: "#27ae60" }]}>Received: {formatDate(item.receivedAt)}</Text>
        </View>
      )}

      {/* Payment Status Display */}
      {item.payment?.status && item.payment.status !== "Pending" && (
        <View style={styles.paymentStatusRow}>
          <Ionicons name="cash-outline" size={16} color={
            item.payment.status === "Paid" ? "#2ecc71" :
            item.payment.status === "Submitted" ? "#f39c12" :
            item.payment.status === "Approved" ? "#3498db" :
            item.payment.status === "Rejected" ? "#e74c3c" : "#666"
          } />
          <Text style={[styles.detailText, { color: 
            item.payment.status === "Paid" ? "#2ecc71" :
            item.payment.status === "Submitted" ? "#f39c12" :
            item.payment.status === "Approved" ? "#3498db" :
            item.payment.status === "Rejected" ? "#e74c3c" : "#666"
          }]}>
            Payment: {item.payment.status}
            {item.payment.submittedAt && ` (${formatDate(item.payment.submittedAt)})`}
          </Text>
        </View>
      )}

      <Text style={styles.dateText}>Ordered: {formatDate(item.createdAt)}</Text>

      {/* Action Buttons - UPDATED with proper payment flow */}
      <View style={styles.actionButtons}>
        {item.status === "Pending" && (
          <TouchableOpacity style={styles.approveBtn} onPress={() => approveOrder(item._id)}>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.btnText}>Approve Order</Text>
          </TouchableOpacity>
        )}

        {item.status === "Approved" && (
          <TouchableOpacity style={styles.deliverBtn} onPress={() => markAsDelivered(item._id)}>
            <Ionicons name="car-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Mark Delivered</Text>
          </TouchableOpacity>
        )}

        {item.status === "Delivered" && (
          <TouchableOpacity style={styles.receiveBtn} onPress={() => markAsReceived(item._id)}>
            <Ionicons name="checkmark-done-circle" size={18} color="#fff" />
            <Text style={styles.btnText}>Mark as Received</Text>
          </TouchableOpacity>
        )}

        {item.status === "Received" && item.payment?.status === "Pending" && (
          <TouchableOpacity style={styles.paymentBtn} onPress={() => submitPaymentRequest(item)}>
            <Ionicons name="cash-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Submit Payment Request</Text>
          </TouchableOpacity>
        )}

        {item.status === "Received" && item.payment?.status === "Submitted" && (
          <View style={styles.paymentSubmitted}>
            <Ionicons name="time-outline" size={20} color="#3498db" />
            <View>
              <Text style={styles.paymentSubmittedText}>Payment Request Submitted ✓</Text>
              <Text style={styles.paymentSubmittedSubtext}>Awaiting finance approval</Text>
            </View>
          </View>
        )}

        {item.status === "Received" && item.payment?.status === "Approved" && (
          <View style={styles.paymentApproved}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#3498db" />
            <View>
              <Text style={styles.paymentSubmittedText}>Payment Approved ✓</Text>
              <Text style={styles.paymentSubmittedSubtext}>Finance processing payment</Text>
            </View>
          </View>
        )}

        {item.status === "Received" && item.payment?.status === "Paid" && (
          <View style={styles.paymentPaid}>
            <Ionicons name="checkmark-done-circle" size={20} color="#2ecc71" />
            <View>
              <Text style={[styles.paymentSubmittedText, { color: "#2ecc71" }]}>Payment Completed ✓</Text>
              <Text style={styles.paymentSubmittedSubtext}>Order fully closed</Text>
            </View>
          </View>
        )}

        {item.status === "Paid" && (
          <View style={styles.paymentPaid}>
            <Ionicons name="checkmark-done-circle" size={20} color="#2ecc71" />
            <View>
              <Text style={[styles.paymentSubmittedText, { color: "#2ecc71" }]}>Payment Completed ✓</Text>
              <Text style={styles.paymentSubmittedSubtext}>Order fully paid and closed</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Inventory Orders</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={20} color="#6200EE" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.btnLabel}>New Order</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#6200EE" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : (
          <FlatList 
            data={orders}
            renderItem={renderOrder}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>No orders found</Text>
                <Text style={styles.emptySubtext}>Create your first order</Text>
              </View>
            }
          />
        )}

        {/* CREATE ORDER MODAL */}
        <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => { setModalVisible(false); resetForm(); }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Order</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Select Item *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={newOrder.item} style={styles.picker} onValueChange={(value) => {
                      if (value) {
                        const selectedItem = items.find(i => i._id === value);
                        setNewOrder({ ...newOrder, item: value, itemName: selectedItem?.name || "" });
                      }
                    }}>
                      <Picker.Item label="Choose an item..." value="" />
                      {items.map((item) => (
                        <Picker.Item key={item._id} label={`${item.name} (${item.currentStock || item.quantity || 0} ${item.unit || 'pcs'} available)`} value={item._id} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Select Supplier *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={newOrder.supplier} style={styles.picker} onValueChange={(value) => {
                      if (value) {
                        const selectedSupplier = suppliers.find(s => s._id === value);
                        setNewOrder({ ...newOrder, supplier: value, supplierName: selectedSupplier?.fullName || "" });
                      }
                    }}>
                      <Picker.Item label="Choose a supplier..." value="" />
                      {suppliers.map((supplier) => (
                        <Picker.Item key={supplier._id} label={`${supplier.fullName} - ${supplier.department}`} value={supplier._id} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Quantity *</Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="cube-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Enter quantity" keyboardType="numeric" value={newOrder.quantity} onChangeText={(text) => {
                      setNewOrder({ ...newOrder, quantity: text }); calcTotal(text, newOrder.unitPrice);
                    }} />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Unit Price (KES) *</Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="pricetag-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Enter unit price" keyboardType="numeric" value={newOrder.unitPrice} onChangeText={(text) => {
                      setNewOrder({ ...newOrder, unitPrice: text }); calcTotal(newOrder.quantity, text);
                    }} />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Total Cost</Text>
                  <View style={styles.totalDisplay}>
                    <Ionicons name="calculator-outline" size={24} color="#6200EE" />
                    <Text style={styles.totalText}>{formatCurrency(newOrder.totalCost)}</Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => { setModalVisible(false); resetForm(); }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.createButton, (!newOrder.item || !newOrder.supplier || !newOrder.quantity || !newOrder.unitPrice) && styles.createButtonDisabled]} onPress={createOrder} disabled={!newOrder.item || !newOrder.supplier || !newOrder.quantity || !newOrder.unitPrice || isCreating}>
                  {isCreating ? <ActivityIndicator size="small" color="#fff" /> : <>
                    <Ionicons name="cart-outline" size={20} color="#fff" />
                    <Text style={styles.createButtonText}>Create Order</Text>
                  </>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* PAYMENT SUBMISSION MODAL */}
        <Modal visible={paymentModalVisible} animationType="slide" transparent={true} onRequestClose={() => setPaymentModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Submit Payment Request to Finance</Text>
                <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
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
                        <Text style={styles.paymentDetailValue}>{selectedOrder.item?.name || selectedOrder.itemName || "Unknown"}</Text>
                      </View>
                      <View style={styles.paymentDetailRow}>
                        <Text style={styles.paymentDetailLabel}>Supplier:</Text>
                        <Text style={styles.paymentDetailValue}>{selectedOrder.supplier?.fullName || selectedOrder.supplier || "Unknown"}</Text>
                      </View>
                      <View style={styles.paymentDetailRow}>
                        <Text style={styles.paymentDetailLabel}>Quantity:</Text>
                        <Text style={styles.paymentDetailValue}>{selectedOrder.quantity}</Text>
                      </View>
                      <View style={styles.paymentDetailRow}>
                        <Text style={styles.paymentDetailLabel}>Unit Price:</Text>
                        <Text style={styles.paymentDetailValue}>{formatCurrency(selectedOrder.unitPrice)}</Text>
                      </View>
                      <View style={[styles.paymentDetailRow, styles.totalPaymentRow]}>
                        <Text style={styles.totalPaymentLabel}>Total Amount Due:</Text>
                        <Text style={styles.totalPaymentValue}>{formatCurrency(selectedOrder.totalCost || selectedOrder.quantity * selectedOrder.unitPrice)}</Text>
                      </View>
                    </View>

                    <View style={styles.infoBox}>
                      <Ionicons name="information-circle-outline" size={20} color="#3498db" />
                      <Text style={styles.infoText}>
                        This will submit a payment request to the Finance Department. The finance team will review, approve, and process the actual payment. You cannot process payments directly from Inventory.
                      </Text>
                    </View>

                    <View style={styles.infoBox}>
                      <Ionicons name="time-outline" size={20} color="#f39c12" />
                      <Text style={styles.infoText}>
                        After submission, the order status will change to "Payment Submitted". The finance team will update the status to "Approved" once they review and to "Paid" once payment is processed.
                      </Text>
                    </View>
                  </>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setPaymentModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.createButton} onPress={handlePaymentSubmit}>
                  <Ionicons name="send-outline" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>Submit to Finance</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const StatusBadge = ({ status }) => {
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'pending': return '#f39c12';
      case 'approved': return '#3498db';
      case 'processing': return '#9b59b6';
      case 'delivered': return '#2ecc71';
      case 'received': return '#27ae60';
      case 'payment pending': return '#e67e22';
      case 'paid': return '#16a085';
      case 'rejected': return '#e74c3c';
      case 'cancelled': return '#95a5a6';
      default: return '#f39c12';
    }
  };

  return (
    <View style={[styles.badge, { backgroundColor: getStatusColor(status) }]}>
      <Text style={styles.badgeText}>{status ? status.toUpperCase() : "PENDING"}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    backgroundColor: "#fff", 
    borderBottomWidth: 1, 
    borderBottomColor: "#eee", 
    elevation: 2 
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#333" },
  headerButtons: { flexDirection: "row", alignItems: "center", gap: 10 },
  refreshBtn: { 
    padding: 8, 
    backgroundColor: "#f0f0f0", 
    borderRadius: 8,
    marginRight: 5
  },
  addBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#6200EE", 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    borderRadius: 8, 
    gap: 8 
  },
  btnLabel: { color: "#fff", fontWeight: "600", fontSize: 14 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },
  listContainer: { padding: 16 },
  card: { 
    backgroundColor: "#fff", 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12, 
    elevation: 2, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 2 
  },
  rowBetween: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "flex-start", 
    marginBottom: 12 
  },
  itemHeader: { flex: 1 },
  title: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 4 },
  orderId: { fontSize: 12, color: "#666", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
  paymentStatusRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 6, 
    gap: 8, 
    padding: 8, 
    backgroundColor: "#f8f9fa", 
    borderRadius: 6 
  },
  detailText: { fontSize: 15, color: "#666" },
  totalCost: { fontSize: 16, fontWeight: "bold", color: "#333" },
  dateText: { 
    fontSize: 12, 
    color: "#999", 
    marginTop: 12, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: "#eee" 
  },
  actionButtons: { marginTop: 12, gap: 8 },
  approveBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#3498db", 
    paddingVertical: 12, 
    borderRadius: 8, 
    gap: 8 
  },
  deliverBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#9b59b6", 
    paddingVertical: 12, 
    borderRadius: 8, 
    gap: 8 
  },
  receiveBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#2ecc71", 
    paddingVertical: 12, 
    borderRadius: 8, 
    gap: 8 
  },
  paymentBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#e67e22", 
    paddingVertical: 12, 
    borderRadius: 8, 
    gap: 8 
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  paymentSubmitted: { 
    flexDirection: "row",
    alignItems: "center", 
    padding: 12, 
    backgroundColor: "#f0f8ff", 
    borderRadius: 8,
    gap: 12
  },
  paymentApproved: { 
    flexDirection: "row",
    alignItems: "center", 
    padding: 12, 
    backgroundColor: "#e8f6f3", 
    borderRadius: 8,
    gap: 12
  },
  paymentPaid: { 
    flexDirection: "row",
    alignItems: "center", 
    padding: 12, 
    backgroundColor: "#e8f6f3", 
    borderRadius: 8,
    gap: 12
  },
  paymentSubmittedText: { fontSize: 14, fontWeight: "600", color: "#3498db", marginBottom: 2 },
  paymentSubmittedSubtext: { fontSize: 12, color: "#666" },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { color: "#fff", fontWeight: "bold", fontSize: 11 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyText: { fontSize: 18, color: "#777", fontWeight: "600", marginTop: 16 },
  emptySubtext: { fontSize: 14, color: "#aaa", marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%" },
  modalHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: "#eee" 
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  modalContent: { padding: 20, maxHeight: 500 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 8 },
  pickerContainer: { 
    borderWidth: 1, 
    borderColor: "#ddd", 
    borderRadius: 8, 
    backgroundColor: "#f9f9f9", 
    overflow: "hidden" 
  },
  picker: { height: 50 },
  inputWithIcon: { 
    flexDirection: "row", 
    alignItems: "center", 
    borderWidth: 1, 
    borderColor: "#ddd", 
    borderRadius: 8, 
    backgroundColor: "#f9f9f9", 
    overflow: "hidden" 
  },
  inputIcon: { paddingHorizontal: 16 },
  input: { flex: 1, padding: 12, fontSize: 16, color: "#333" },
  totalDisplay: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#f3e5f5", 
    padding: 16, 
    borderRadius: 8, 
    gap: 12 
  },
  totalText: { fontSize: 20, fontWeight: "bold", color: "#6200EE" },
  paymentSummary: { 
    backgroundColor: "#f8f9fa", 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 20 
  },
  paymentSummaryTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 12 },
  paymentDetailRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  paymentDetailLabel: { fontSize: 14, color: "#666", flex: 1 },
  paymentDetailValue: { fontSize: 14, color: "#333", fontWeight: "500", flex: 2, textAlign: "right" },
  totalPaymentRow: { borderTopWidth: 1, borderTopColor: "#ddd", paddingTop: 12, marginTop: 8 },
  totalPaymentLabel: { fontSize: 16, color: "#333", fontWeight: "bold", flex: 1 },
  totalPaymentValue: { fontSize: 18, color: "#6200EE", fontWeight: "bold", flex: 2, textAlign: "right" },
  infoBox: { 
    flexDirection: "row", 
    alignItems: "flex-start", 
    gap: 10, 
    padding: 16, 
    backgroundColor: "#e8f4fd", 
    borderRadius: 8, 
    marginTop: 10 
  },
  infoText: { flex: 1, fontSize: 14, color: "#3498db" },
  modalFooter: { 
    flexDirection: "row", 
    padding: 20, 
    borderTopWidth: 1, 
    borderTopColor: "#eee", 
    gap: 12 
  },
  cancelButton: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: "#f5f5f5", 
    borderRadius: 8, 
    alignItems: "center" 
  },
  cancelButtonText: { color: "#666", fontSize: 16, fontWeight: "600" },
  createButton: { 
    flex: 2, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 8, 
    padding: 16, 
    backgroundColor: "#6200EE", 
    borderRadius: 8 
  },
  createButtonDisabled: { backgroundColor: "#b39ddb", opacity: 0.7 },
  createButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});