import React, { useState, useEffect } from "react";
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Alert, Modal, TextInput, ScrollView, 
  RefreshControl, Dimensions, StatusBar 
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get("window");
const API = "https://fanaka-server-1.onrender.com";

export default function SupplierHomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState("pending");
  const [modalVisible, setModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [supplierInfo, setSupplierInfo] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, delivered: 0, rejected: 0, paid: 0, pendingConfirmation: 0 });
  const [newOrder, setNewOrder] = useState({ itemName: "", description: "", quantity: "", unitPrice: "", estimatedDelivery: "", notes: "" });
  const [updateData, setUpdateData] = useState({ status: "", deliveryDate: "", notes: "", trackingNumber: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentConfirmationModal, setPaymentConfirmationModal] = useState(false);
  const [paymentProof, setPaymentProof] = useState("");
  const [generatingReceipt, setGeneratingReceipt] = useState(false);

  const fetchSupplierProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userType = await AsyncStorage.getItem("userType");
      const employeeId = await AsyncStorage.getItem("employeeId");
      const userName = await AsyncStorage.getItem("userName");
      
      if (employeeId) {
        setSupplierInfo({ _id: employeeId, fullName: userName || "Supplier", department: "Supplier" });
      } else if (token && userType === "supplier") {
        try {
          const response = await axios.get(`${API}/api/employees/profile`, { headers: { Authorization: `Bearer ${token}` } });
          setSupplierInfo(response.data);
        } catch (apiErr) {
          setSupplierInfo({ fullName: userName || "Supplier", department: "Supplier" });
        }
      } else {
        setSupplierInfo({ fullName: userName || "Supplier", department: "Supplier" });
      }
    } catch (err) {
      setSupplierInfo({ fullName: "Supplier", department: "Supplier" });
    }
  };

  const fetchSupplierOrders = async () => {
    try {
      setLoading(true);
      if (!supplierInfo) return;
      
      const allResponse = await axios.get(`${API}/api/orders`);
      const allOrders = allResponse.data.orders || [];
      let myOrders = [];
      const supplierId = supplierInfo?._id;
      const supplierName = supplierInfo?.fullName || "Supplier";
      
      if (supplierId && supplierId !== "supplier_id") {
        try {
          const response = await axios.get(`${API}/api/orders/supplier/${supplierId}`);
          myOrders = response.data.orders || [];
        } catch (endpointErr) {}
      }
      
      if (myOrders.length === 0) {
        myOrders = allOrders.filter(order => {
          const orderSupplierId = order.supplier?._id || order.supplier;
          const orderSupplierName = order.supplierName || order.supplier?.fullName;
          if (supplierId && orderSupplierId && orderSupplierId.toString() === supplierId.toString()) return true;
          if (supplierName && orderSupplierName && orderSupplierName.toLowerCase().includes(supplierName.toLowerCase())) return true;
          return false;
        });
      }
      
      if (myOrders.length === 0) myOrders = allOrders;
      setOrders(myOrders);
      filterOrders(activeFilter, myOrders);
      updateStats(myOrders);
    } catch (err) {
      Alert.alert("Error", "Failed to load orders");
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateStats = (orderList) => {
    setStats({
      total: orderList.length,
      pending: orderList.filter(o => (o.status || "").toLowerCase() === "pending").length,
      approved: orderList.filter(o => (o.status || "").toLowerCase() === "approved").length,
      delivered: orderList.filter(o => (o.status || "").toLowerCase() === "delivered").length,
      rejected: orderList.filter(o => (o.status || "").toLowerCase() === "rejected").length,
      paid: orderList.filter(o => o.payment?.status === "Paid").length,
      pendingConfirmation: orderList.filter(o => o.payment?.status === "Paid" && !o.payment?.supplierConfirmation).length
    });
  };

  const filterOrders = (status, orderList = orders) => {
    setActiveFilter(status);
    let filtered = orderList;
    if (status !== "all") {
      if (status === "paid") filtered = orderList.filter(order => order.payment?.status === "Paid");
      else if (status === "pending_confirmation") filtered = orderList.filter(order => order.payment?.status === "Paid" && !order.payment?.supplierConfirmation);
      else filtered = orderList.filter(order => (order.status || "").toLowerCase() === status.toLowerCase());
    }
    if (searchQuery) {
      filtered = filtered.filter(order => {
        const searchLower = searchQuery.toLowerCase();
        return (
          (order.itemName || "").toLowerCase().includes(searchLower) ||
          (order.item?.name || "").toLowerCase().includes(searchLower) ||
          (order._id || "").toLowerCase().includes(searchLower) ||
          (order.trackingNumber || "").toLowerCase().includes(searchLower)
        );
      });
    }
    setFilteredOrders(filtered);
  };

  useEffect(() => { filterOrders(activeFilter); }, [searchQuery, orders]);
  useFocusEffect(React.useCallback(() => { fetchSupplierProfile(); }, []));
  useEffect(() => { if (supplierInfo) fetchSupplierOrders(); }, [supplierInfo]);

  const onRefresh = () => { setRefreshing(true); fetchSupplierOrders(); };

  const generateTrackingNumber = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let tracking = 'TRK';
    for (let i = 0; i < 10; i++) tracking += chars.charAt(Math.floor(Math.random() * chars.length));
    return tracking;
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const action = newStatus === "approved" ? "Approve" : newStatus === "rejected" ? "Reject" : newStatus === "delivered" ? "Mark as Delivered" : "Update";
      Alert.alert(`${action} Order`, `Are you sure you want to ${action.toLowerCase()} this order?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: action, onPress: async () => {
            try {
              let updatePayload = { status: newStatus };
              if (newStatus === "delivered") {
                const today = new Date();
                const deliveryDate = today.toISOString().split('T')[0];
                const trackingNumber = generateTrackingNumber();
                updatePayload = { ...updatePayload, deliveryDate, trackingNumber, ...(updateData.notes && { notes: updateData.notes }) };
              } else if (newStatus === "approved" || newStatus === "rejected") {
                updatePayload = { ...updatePayload, ...(updateData.notes && { notes: updateData.notes }) };
              }
              await axios.put(`${API}/api/orders/${orderId}`, updatePayload);
              if (newStatus === "delivered") {
                Alert.alert("Success", `Order marked as Delivered!\nTracking Number: ${updatePayload.trackingNumber}\nDelivery Date: ${updatePayload.deliveryDate}`);
              } else {
                Alert.alert("Success", `Order ${newStatus.toLowerCase()} successfully!`);
              }
              fetchSupplierOrders();
              setUpdateModalVisible(false);
              setUpdateData({ status: "", deliveryDate: "", notes: "", trackingNumber: "" });
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to update order");
            }
          }
        }
      ]);
    } catch (err) {
      Alert.alert("Error", "Failed to update order");
    }
  };

  const createOrderProposal = async () => {
    const { itemName, quantity, unitPrice } = newOrder;
    if (!itemName || !quantity || !unitPrice) {
      Alert.alert("Validation", "Please fill all required fields");
      return;
    }
    try {
      const orderData = {
        itemName,
        description: newOrder.description,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        estimatedDelivery: newOrder.estimatedDelivery,
        notes: newOrder.notes,
        supplierName: supplierInfo?.fullName || "Supplier",
        status: "Pending"
      };
      const response = await axios.post(`${API}/api/orders`, orderData);
      Alert.alert("Success", "Order proposal submitted");
      setModalVisible(false);
      setNewOrder({ itemName: "", description: "", quantity: "", unitPrice: "", estimatedDelivery: "", notes: "" });
      fetchSupplierOrders();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to submit proposal");
    }
  };

  const handleConfirmPaymentReceived = async () => {
    if (!paymentProof.trim()) {
      Alert.alert("Validation", "Please enter payment proof/reference");
      return;
    }
    try {
      const orderId = selectedOrder?._id;
      if (!orderId) return;
      const token = await AsyncStorage.getItem("token");
      const paymentConfirmationData = {
        confirmedBy: supplierInfo?._id || "supplier_id",
        confirmedByName: supplierInfo?.fullName || "Supplier",
        transactionProof: paymentProof,
        confirmationNotes: `Payment confirmed as received by supplier. Proof: ${paymentProof}`
      };
      const response = await axios.put(
        `${API}/api/orders/${orderId}/confirm-payment`,
        paymentConfirmationData,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (response.data.success) {
        Alert.alert("Success", "Payment confirmation submitted successfully!");
        setPaymentConfirmationModal(false);
        setPaymentProof("");
        fetchSupplierOrders();
      } else {
        Alert.alert("Error", response.data.message || "Failed to confirm payment");
      }
    } catch (error) {
      console.error("Payment confirmation error:", error.response?.data || error.message);
      Alert.alert("Error", error.response?.data?.message || "Failed to confirm payment");
    }
  };

  // Updated generateReceipt function with new File System API
  const generateReceipt = async (order) => {
    try {
      setGeneratingReceipt(true);
      const totalAmount = order.totalCost || (order.quantity * order.unitPrice);
      const paymentInfo = order.payment || {};
      const supplierConfirmation = order.payment?.supplierConfirmation || false;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Payment Receipt</title>
          <style>
            body{font-family:Arial,sans-serif;margin:40px;}.header{text-align:center;margin-bottom:30px;}
            .header h1{color:#333;margin-bottom:5px;}.header h2{color:#666;font-size:18px;margin:0;}
            .section{margin-bottom:20px;}.section-title{font-weight:bold;color:#333;margin-bottom:10px;border-bottom:2px solid #6200EE;padding-bottom:5px;}
            .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;}.info-item{margin-bottom:8px;}
            .label{font-weight:bold;color:#666;}.value{color:#333;}
            .total-section{background:#f8f9fa;padding:20px;border-radius:10px;margin-top:20px;text-align:center;}
            .total-amount{font-size:28px;color:#6200EE;font-weight:bold;margin:10px 0;}
            .payment-info{background:#e8f5e9;padding:15px;border-radius:8px;margin-top:20px;}
            .supplier-confirmation{background:#fff3cd;padding:15px;border-radius:8px;margin-top:20px;border:1px solid #ffeaa7;}
            .footer{margin-top:30px;text-align:center;color:#666;font-size:12px;border-top:1px solid #ddd;padding-top:10px;}
          </style>
        </head>
        <body>
          <div class="header"><h1>FANAKA ARTS LTD</h1><h2>PAYMENT RECEIPT</h2></div>
          <div class="section"><div class="section-title">Order Details</div><div class="info-grid">
            <div class="info-item"><span class="label">Receipt No:</span><span class="value">${order._id?.slice(-8)||'N/A'}</span></div>
            <div class="info-item"><span class="label">Date:</span><span class="value">${new Date().toLocaleDateString()}</span></div>
            <div class="info-item"><span class="label">Supplier:</span><span class="value">${order.supplierName||order.supplier?.fullName||'N/A'}</span></div>
            <div class="info-item"><span class="label">Item:</span><span class="value">${order.itemName||order.item?.name||'N/A'}</span></div>
            <div class="info-item"><span class="label">Quantity:</span><span class="value">${order.quantity}</span></div>
            <div class="info-item"><span class="label">Unit Price:</span><span class="value">KES ${parseFloat(order.unitPrice||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</span></div>
          </div></div>
          <div class="total-section"><div>TOTAL AMOUNT PAID</div>
            <div class="total-amount">KES ${parseFloat(totalAmount).toLocaleString('en-KE',{minimumFractionDigits:2})}</div>
          </div>
          ${paymentInfo.status==='Paid'?`
          <div class="payment-info"><div class="section-title">Payment Information</div><div class="info-grid">
            <div class="info-item"><span class="label">Payment Status:</span><span class="value" style="color:#2ecc71;font-weight:bold;">PAID</span></div>
            <div class="info-item"><span class="label">Payment Method:</span><span class="value">${paymentInfo.paymentMethod||'N/A'}</span></div>
            <div class="info-item"><span class="label">Transaction ID:</span><span class="value">${paymentInfo.transactionId||'N/A'}</span></div>
            <div class="info-item"><span class="label">Paid Date:</span><span class="value">${paymentInfo.paymentDate?new Date(paymentInfo.paymentDate).toLocaleDateString():'N/A'}</span></div>
            <div class="info-item"><span class="label">Processed By:</span><span class="value">${paymentInfo.processedBy?.name||'Finance Department'}</span></div>
          </div></div>`:''}
          ${supplierConfirmation?`
          <div class="supplier-confirmation"><div class="section-title">Supplier Confirmation</div><div class="info-grid">
            <div class="info-item"><span class="label">Confirmed by Supplier:</span><span class="value" style="color:#27ae60;font-weight:bold;">YES</span></div>
            <div class="info-item"><span class="label">Confirmation Date:</span><span class="value">${paymentInfo.confirmationDate?new Date(paymentInfo.confirmationDate).toLocaleDateString():'N/A'}</span></div>
            <div class="info-item"><span class="label">Confirmed By:</span><span class="value">${paymentInfo.confirmedByName||order.supplierName||'Supplier'}</span></div>
            <div class="info-item"><span class="label">Proof/Reference:</span><span class="value">${paymentInfo.transactionProof||'N/A'}</span></div>
          </div><p style="margin-top:10px;font-style:italic;color:#666;">Payment has been confirmed as received by the supplier.</p></div>`:''}
          <div class="footer">
            <p>This is an automatically generated receipt. For any inquiries, please contact accounts@fanakaarts.com</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>`;

      // Generate PDF using expo-print
      const { uri } = await Print.printToFileAsync({ 
        html: htmlContent, 
        base64: false 
      });

      // Create a new filename for the receipt
      const fileName = `receipt_${order._id}_${Date.now()}.pdf`;
      const directory = FileSystem.documentDirectory;
      const newUri = directory + fileName;

      // Read the generated file
      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Write to new location using new API
      await FileSystem.writeAsStringAsync(newUri, fileContent, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share the PDF using expo-sharing
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, { 
          mimeType: 'application/pdf', 
          dialogTitle: 'Share Receipt',
          UTI: 'com.adobe.pdf' 
        });
      } else {
        Alert.alert("Success", "Receipt generated! Check your files.");
      }
    } catch (error) {
      console.error("Receipt generation error:", error);
      Alert.alert("Error", "Failed to generate receipt: " + error.message);
    } finally {
      setGeneratingReceipt(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return dateString; }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    return `KES ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderOrderItem = ({ item }) => {
    const orderStatus = item.status || "Pending";
    const orderStatusLower = orderStatus.toLowerCase();
    const paymentStatus = item.payment?.status || "";
    const isPaid = paymentStatus === "Paid";
    const isPaymentConfirmed = item.payment?.supplierConfirmation || false;
    const itemName = item.itemName || item.item?.name || "Unknown Item";
    
    return (
      <TouchableOpacity style={styles.orderCard} onPress={() => { setSelectedOrder(item); setUpdateModalVisible(true); }}>
        <View style={styles.orderHeader}>
          <View style={styles.orderTitleContainer}>
            <Text style={styles.orderTitle} numberOfLines={1}>{itemName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(orderStatusLower).bg }]}>
              <Text style={[styles.statusText, { color: getStatusColor(orderStatusLower).text }]}>
                {isPaid ? (isPaymentConfirmed ? "PAID ✓" : "PAID") : orderStatus.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.orderDetails}>
          <View style={styles.detailRow}><Ionicons name="cube-outline" size={16} color="#666" /><Text style={styles.detailText}>Quantity: {item.quantity}</Text></View>
          <View style={styles.detailRow}><Ionicons name="pricetag-outline" size={16} color="#666" /><Text style={styles.detailText}>Unit Price: {formatCurrency(item.unitPrice)}</Text></View>
          <View style={styles.detailRow}><Ionicons name="calculator-outline" size={16} color="#333" /><Text style={styles.totalText}>Total: {formatCurrency(item.quantity * item.unitPrice)}</Text></View>
          {isPaid && (<>
            <View style={styles.detailRow}><Ionicons name="card-outline" size={16} color="#2ecc71" /><Text style={[styles.detailText, { color: "#2ecc71" }]}>Paid via: {item.payment?.paymentMethod || "Bank Transfer"}</Text></View>
            {item.payment?.transactionId && (<View style={styles.detailRow}><Ionicons name="receipt-outline" size={16} color="#3498db" /><Text style={styles.detailText}>Transaction: {item.payment.transactionId}</Text></View>)}
            {isPaymentConfirmed ? (<View style={styles.detailRow}><Ionicons name="checkmark-circle" size={16} color="#27ae60" /><Text style={[styles.detailText, { color: "#27ae60", fontWeight: "bold" }]}>Payment Confirmed ✓</Text></View>) : 
             (<View style={styles.detailRow}><Ionicons name="alert-circle-outline" size={16} color="#f39c12" /><Text style={[styles.detailText, { color: "#f39c12" }]}>Awaiting your confirmation</Text></View>)}
          </>)}
        </View>
        <View style={styles.orderActions}>
          {orderStatusLower === "pending" && (<>
            <TouchableOpacity style={styles.approveBtn} onPress={() => updateOrderStatus(item._id, "Approved")}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" /><Text style={styles.actionBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => updateOrderStatus(item._id, "Rejected")}>
              <Ionicons name="close-circle" size={16} color="#fff" /><Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </>)}
          {orderStatusLower === "approved" && (<TouchableOpacity style={styles.deliverBtn} onPress={() => updateOrderStatus(item._id, "Delivered")}>
            <Ionicons name="checkmark-done-circle" size={16} color="#fff" /><Text style={styles.actionBtnText}>Mark Delivered</Text>
          </TouchableOpacity>)}
          {isPaid && !isPaymentConfirmed && (<TouchableOpacity style={styles.confirmPaymentBtn} onPress={() => { setSelectedOrder(item); setPaymentConfirmationModal(true); }}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" /><Text style={styles.actionBtnText}>Confirm Payment</Text>
          </TouchableOpacity>)}
          {isPaid && (<TouchableOpacity style={styles.receiptBtn} onPress={() => generateReceipt(item)} disabled={generatingReceipt}>
            {generatingReceipt && selectedOrder?._id === item._id ? <ActivityIndicator size="small" color="#fff" /> : 
             <><Ionicons name="document-text-outline" size={16} color="#fff" /><Text style={styles.actionBtnText}>Get Receipt</Text></>}
          </TouchableOpacity>)}
          <TouchableOpacity style={styles.detailsBtn} onPress={() => { setSelectedOrder(item); setUpdateModalVisible(true); }}>
            <Ionicons name="information-circle-outline" size={16} color="#6200EE" /><Text style={styles.detailsBtnText}>Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case "pending": return { bg: "#FFF3E0", text: "#FF9800" };
      case "approved": return { bg: "#E8F5E9", text: "#4CAF50" };
      case "processing": return { bg: "#E3F2FD", text: "#2196F3" };
      case "delivered": return { bg: "#E8F5E9", text: "#4CAF50" };
      case "paid": return { bg: "#d4edda", text: "#155724" };
      case "rejected": return { bg: "#FFEBEE", text: "#F44336" };
      default: return { bg: "#F5F5F5", text: "#666" };
    }
  };

  const StatsCard = ({ title, value, color, icon }) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <View style={styles.statsHeader}><View style={[styles.statsIcon, { backgroundColor: `${color}20` }]}><Ionicons name={icon} size={24} color={color} /></View>
      <Text style={styles.statsTitle}>{title}</Text></View>
      <Text style={[styles.statsValue, { color }]}>{value}</Text>
    </View>
  );

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("userType");
        await AsyncStorage.removeItem("userName");
        await AsyncStorage.removeItem("employeeId");
        navigation.replace("Login");
      }}
    ]);
  };

  if (loading && !refreshing) {
    return (<View style={styles.loader}><ActivityIndicator size="large" color="#6200EE" /><Text style={styles.loadingText}>Loading your orders...</Text></View>);
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#6200EE" barStyle="light-content" />
      <View style={styles.header}>
        <View><Text style={styles.welcomeText}>Welcome, {supplierInfo?.fullName || "Supplier"}</Text>
        <Text style={styles.headerSubtitle}>{supplierInfo?.department || "Supplier Department"}</Text></View>
        <TouchableOpacity onPress={handleLogout}><Ionicons name="log-out-outline" size={24} color="#fff" /></TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}><Ionicons name="search-outline" size={20} color="#666" />
          <TextInput style={styles.searchInput} placeholder="Search orders by item, ID, or tracking..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#999" />
          {searchQuery ? (<TouchableOpacity onPress={() => setSearchQuery("")}><Ionicons name="close-circle" size={20} color="#666" /></TouchableOpacity>) : null}
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
        <StatsCard title="Total Orders" value={stats.total} color="#6200EE" icon="cube-outline" />
        <StatsCard title="Pending" value={stats.pending} color="#FF9800" icon="time-outline" />
        <StatsCard title="Approved" value={stats.approved} color="#4CAF50" icon="checkmark-circle-outline" />
        <StatsCard title="Delivered" value={stats.delivered} color="#2196F3" icon="checkmark-done-circle" />
        <StatsCard title="Paid" value={stats.paid} color="#2ecc71" icon="cash-outline" />
        <StatsCard title="Pending Confirmation" value={stats.pendingConfirmation} color="#f39c12" icon="alert-circle-outline" />
        <StatsCard title="Rejected" value={stats.rejected} color="#F44336" icon="close-circle-outline" />
      </ScrollView>
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {["pending","approved","delivered","paid","pending_confirmation","rejected","all"].map(filter => (
            <TouchableOpacity key={filter} style={[styles.filterTab, activeFilter===filter && styles.activeFilterTab]} onPress={() => filterOrders(filter)}>
              <Text style={[styles.filterText, activeFilter===filter && styles.activeFilterText]}>
                {filter==="pending_confirmation"?"Awaiting Confirmation":filter.charAt(0).toUpperCase()+filter.slice(1)}
              </Text>
              {filter!=="all" && (<View style={styles.filterCount}><Text style={styles.filterCountText}>
                {filter==="pending"?stats.pending:filter==="approved"?stats.approved:filter==="delivered"?stats.delivered:
                 filter==="paid"?stats.paid:filter==="pending_confirmation"?stats.pendingConfirmation:filter==="rejected"?stats.rejected:0}
              </Text></View>)}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <FlatList data={filteredOrders} renderItem={renderOrderItem} keyExtractor={item=>item._id} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6200EE"]} tintColor="#6200EE" />}
        ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="cube-outline" size={80} color="#ddd" /><Text style={styles.emptyTitle}>
          {searchQuery?"No orders match your search":activeFilter==="pending_confirmation"?"No orders awaiting confirmation":`No ${activeFilter==="all"?"":activeFilter} orders`}
        </Text><Text style={styles.emptyText}>
          {searchQuery?"Try different search terms":activeFilter==="pending"?"No pending orders require your action.":
           activeFilter==="pending_confirmation"?"All payments have been confirmed!":`No ${activeFilter} orders found.`}
        </Text></View>}
        ListHeaderComponent={filteredOrders.length>0 && (<View style={styles.listHeader}><Text style={styles.listTitle}>
          {activeFilter==="pending"?"Orders Requiring Action":activeFilter==="approved"?"Approved Orders":
           activeFilter==="delivered"?"Delivered Orders":activeFilter==="paid"?"Paid Orders":
           activeFilter==="pending_confirmation"?"Orders Awaiting Payment Confirmation":
           activeFilter==="rejected"?"Rejected Orders":"All Orders"} ({filteredOrders.length})
        </Text></View>)}
      />
      <TouchableOpacity style={styles.floatingButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="add-circle" size={24} color="#fff" /><Text style={styles.floatingButtonText}>New Order</Text>
      </TouchableOpacity>

      <Modal visible={paymentConfirmationModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}><View style={styles.modalContainer}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Confirm Payment Received</Text>
            <TouchableOpacity onPress={() => setPaymentConfirmationModal(false)}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedOrder && (<>
              <View style={styles.paymentSummary}><Text style={styles.summaryTitle}>
                {selectedOrder.itemName||selectedOrder.item?.name||"Unknown Item"}</Text>
                <Text style={styles.paymentAmount}>Amount Received: {formatCurrency(selectedOrder.totalCost||(selectedOrder.quantity*selectedOrder.unitPrice))}</Text>
                <View style={styles.infoNote}><Ionicons name="information-circle-outline" size={16} color="#3498db" />
                  <Text style={styles.infoNoteText}>Confirm that you have received payment for this order</Text>
                </View>
              </View>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Payment Proof / Reference *</Text>
                <Text style={styles.inputHelp}>Enter the transaction ID, payment reference, or any proof that you received payment</Text>
                <TextInput style={[styles.input,styles.textArea]} placeholder="e.g., MPesa Transaction ID, Bank Reference Number, Payment Slip No."
                  value={paymentProof} onChangeText={setPaymentProof} multiline numberOfLines={3} />
              </View>
              <View style={styles.infoBox}><Ionicons name="alert-circle-outline" size={20} color="#f39c12" />
                <Text style={styles.infoText}><Text style={{fontWeight:'bold'}}>Important:</Text> Only confirm payment after you have actually received the money. This confirmation will be recorded and notified to the finance department.</Text>
              </View>
              <View style={styles.confirmationSteps}><Text style={styles.stepsTitle}>Before confirming, ensure:</Text>
                <View style={styles.stepItem}><Ionicons name="checkmark-circle" size={16} color="#27ae60" /><Text style={styles.stepText}>Payment has been received in your account</Text></View>
                <View style={styles.stepItem}><Ionicons name="checkmark-circle" size={16} color="#27ae60" /><Text style={styles.stepText}>You have verified the payment details</Text></View>
                <View style={styles.stepItem}><Ionicons name="checkmark-circle" size={16} color="#27ae60" /><Text style={styles.stepText}>The amount matches the order total</Text></View>
              </View>
            </>)}
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setPaymentConfirmationModal(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.confirmPaymentButton,!paymentProof.trim()&&styles.submitButtonDisabled]} onPress={handleConfirmPaymentReceived} disabled={!paymentProof.trim()}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.submitButtonText}>Confirm Payment Received</Text>
            </TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}><View style={styles.modalContainer}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Submit Order Proposal</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput style={styles.input} placeholder="Enter item name" value={newOrder.itemName} onChangeText={text=>setNewOrder({...newOrder,itemName:text})} />
            </View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Description</Text>
              <TextInput style={[styles.input,styles.textArea]} placeholder="Item description" multiline numberOfLines={3} value={newOrder.description} onChangeText={text=>setNewOrder({...newOrder,description:text})} />
            </View>
            <View style={styles.row}><View style={[styles.inputGroup,{flex:1,marginRight:10}]}><Text style={styles.inputLabel}>Quantity *</Text>
                <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={newOrder.quantity} onChangeText={text=>setNewOrder({...newOrder,quantity:text})} />
              </View>
              <View style={[styles.inputGroup,{flex:1}]}><Text style={styles.inputLabel}>Unit Price (KES) *</Text>
                <TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={newOrder.unitPrice} onChangeText={text=>setNewOrder({...newOrder,unitPrice:text})} />
              </View>
            </View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Estimated Delivery Date</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={newOrder.estimatedDelivery} onChangeText={text=>setNewOrder({...newOrder,estimatedDelivery:text})} />
            </View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Notes</Text>
              <TextInput style={[styles.input,styles.textArea]} placeholder="Additional notes or specifications" multiline numberOfLines={3} value={newOrder.notes} onChangeText={text=>setNewOrder({...newOrder,notes:text})} />
            </View>
            <View style={styles.totalSection}><Text style={styles.totalLabel}>Estimated Total:</Text>
              <Text style={styles.totalAmount}>{formatCurrency(newOrder.quantity*newOrder.unitPrice)}</Text>
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.submitButton,(!newOrder.itemName||!newOrder.quantity||!newOrder.unitPrice)&&styles.submitButtonDisabled]} onPress={createOrderProposal} disabled={!newOrder.itemName||!newOrder.quantity||!newOrder.unitPrice}>
              <Ionicons name="send-outline" size={20} color="#fff" /><Text style={styles.submitButtonText}>Submit Proposal</Text>
            </TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      <Modal visible={updateModalVisible} animationType="slide" transparent={true} onRequestClose={() => setUpdateModalVisible(false)}>
        <View style={styles.modalOverlay}><View style={styles.modalContainer}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Order Details</Text>
            <TouchableOpacity onPress={() => setUpdateModalVisible(false)}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
          </View>
          {selectedOrder && (<ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.orderSummary}><Text style={styles.summaryTitle}>{selectedOrder.itemName||selectedOrder.item?.name||"Unknown Item"}</Text>
              <View style={[styles.statusBadgeLarge,{backgroundColor:getStatusColor(selectedOrder.status?.toLowerCase()).bg}]}>
                <Text style={[styles.statusTextLarge,{color:getStatusColor(selectedOrder.status?.toLowerCase()).text}]}>{(selectedOrder.status||"Pending").toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.detailsSection}>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Order ID:</Text><Text style={[styles.detailValue,{fontSize:12}]}>{selectedOrder._id}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Quantity:</Text><Text style={styles.detailValue}>{selectedOrder.quantity}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Unit Price:</Text><Text style={styles.detailValue}>{formatCurrency(selectedOrder.unitPrice)}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Total:</Text><Text style={styles.detailValue}>{formatCurrency(selectedOrder.quantity*selectedOrder.unitPrice)}</Text></View>
              <View style={styles.detailItem}><Text style={styles.detailLabel}>Order Date:</Text><Text style={styles.detailValue}>{formatDate(selectedOrder.createdAt)}</Text></View>
              {selectedOrder.estimatedDelivery&&(<View style={styles.detailItem}><Text style={styles.detailLabel}>Est. Delivery:</Text><Text style={styles.detailValue}>{formatDate(selectedOrder.estimatedDelivery)}</Text></View>)}
              {selectedOrder.deliveryDate&&(<View style={styles.detailItem}><Text style={styles.detailLabel}>Actual Delivery:</Text><Text style={styles.detailValue}>{formatDate(selectedOrder.deliveryDate)}</Text></View>)}
              {selectedOrder.trackingNumber&&(<View style={styles.detailItem}><Text style={styles.detailLabel}>Tracking Number:</Text><Text style={styles.detailValue}>{selectedOrder.trackingNumber}</Text></View>)}
              {selectedOrder.notes&&(<View style={styles.detailItem}><Text style={styles.detailLabel}>Notes:</Text><Text style={styles.detailValue}>{selectedOrder.notes}</Text></View>)}
              {selectedOrder.payment&&(<View style={styles.paymentDetailsSection}><Text style={styles.sectionTitle}>Payment Information</Text>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Payment Status:</Text><Text style={[styles.detailValue,{color:selectedOrder.payment.status==="Paid"?"#2ecc71":"#f39c12",fontWeight:"bold"}]}>{selectedOrder.payment.status||"Pending"}</Text></View>
                {selectedOrder.payment.paymentMethod&&(<View style={styles.detailItem}><Text style={styles.detailLabel}>Method:</Text><Text style={styles.detailValue}>{selectedOrder.payment.paymentMethod}</Text></View>)}
                {selectedOrder.payment.transactionId&&(<View style={styles.detailItem}><Text style={styles.detailLabel}>Transaction ID:</Text><Text style={styles.detailValue}>{selectedOrder.payment.transactionId}</Text></View>)}
                {selectedOrder.payment.paymentDate&&(<View style={styles.detailItem}><Text style={styles.detailLabel}>Paid Date:</Text><Text style={styles.detailValue}>{formatDate(selectedOrder.payment.paymentDate)}</Text></View>)}
                {selectedOrder.payment.supplierConfirmation?(<View style={styles.detailItem}><Text style={styles.detailLabel}>Supplier Confirmed:</Text><Text style={[styles.detailValue,{color:"#27ae60",fontWeight:"bold"}]}>✓ Yes</Text></View>):
                 selectedOrder.payment.status==="Paid"&&(<View style={styles.detailItem}><Text style={styles.detailLabel}>Supplier Confirmed:</Text><Text style={[styles.detailValue,{color:"#f39c12"}]}>Pending</Text></View>)}
                {selectedOrder.payment.transactionProof&&(<View style={styles.detailItem}><Text style={styles.detailLabel}>Payment Proof:</Text><Text style={styles.detailValue}>{selectedOrder.payment.transactionProof}</Text></View>)}
              </View>)}
            </View>
            {selectedOrder.status?.toLowerCase()==="pending"&&(<View style={styles.updateSection}><Text style={styles.sectionTitle}>Action Required</Text>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Decision</Text><View style={styles.statusButtons}>
                <TouchableOpacity style={styles.approveButtonLarge} onPress={() => updateOrderStatus(selectedOrder._id,"Approved")}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.statusButtonText}>Approve Order</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectButtonLarge} onPress={() => updateOrderStatus(selectedOrder._id,"Rejected")}>
                  <Ionicons name="close-circle" size={20} color="#fff" /><Text style={styles.statusButtonText}>Reject Order</Text>
                </TouchableOpacity>
              </View></View>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput style={[styles.input,styles.textArea]} placeholder="Add notes about your decision" multiline numberOfLines={3} value={updateData.notes} onChangeText={text=>setUpdateData({...updateData,notes:text})} />
              </View>
            </View>)}
            {selectedOrder.status?.toLowerCase()==="approved"&&(<View style={styles.updateSection}><Text style={styles.sectionTitle}>Ready for Delivery</Text>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Mark as Delivered</Text><Text style={styles.infoText}>
                When you mark this order as delivered, the system will automatically generate a tracking number and set today's date as the delivery date.</Text>
                <TouchableOpacity style={styles.deliverButtonLarge} onPress={() => updateOrderStatus(selectedOrder._id,"Delivered")}>
                  <Ionicons name="checkmark-done-circle" size={20} color="#fff" /><Text style={styles.statusButtonText}>Mark as Delivered</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Delivery Notes (Optional)</Text>
                <TextInput style={[styles.input,styles.textArea]} placeholder="Add delivery notes" multiline numberOfLines={3} value={updateData.notes} onChangeText={text=>setUpdateData({...updateData,notes:text})} />
              </View>
            </View>)}
            {selectedOrder.payment?.status==="Paid"&&!selectedOrder.payment?.supplierConfirmation&&(<View style={styles.updateSection}><Text style={styles.sectionTitle}>Payment Confirmation</Text>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Confirm Payment Received</Text><Text style={styles.infoText}>
                The payment status shows as "Paid". Please confirm that you have received this payment.</Text>
                <TouchableOpacity style={styles.confirmPaymentButtonLarge} onPress={() => { setSelectedOrder(selectedOrder); setPaymentConfirmationModal(true); setUpdateModalVisible(false); }}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.statusButtonText}>Confirm Payment Received</Text>
                </TouchableOpacity>
              </View>
            </View>)}
          </ScrollView>)}
          <View style={styles.modalFooter}><TouchableOpacity style={styles.cancelButton} onPress={() => setUpdateModalVisible(false)}><Text style={styles.cancelButtonText}>Close</Text></TouchableOpacity></View>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:"#f8f9fa",paddingTop:StatusBar.currentHeight||0},
  loader:{flex:1,justifyContent:"center",alignItems:"center",backgroundColor:"#f8f9fa"},
  loadingText:{marginTop:12,fontSize:16,color:"#666"},
  header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingHorizontal:20,paddingVertical:16,backgroundColor:"#6200EE"},
  welcomeText:{fontSize:20,fontWeight:"bold",color:"#fff",marginBottom:4},
  headerSubtitle:{fontSize:14,color:"#e0e0e0"},
  searchContainer:{padding:16,paddingTop:12,backgroundColor:"#fff"},
  searchBox:{flexDirection:"row",alignItems:"center",backgroundColor:"#f5f5f5",borderRadius:10,paddingHorizontal:12,paddingVertical:10},
  searchInput:{flex:1,marginLeft:10,fontSize:16,color:"#333"},
  statsContainer:{paddingVertical:12,paddingHorizontal:10},
  statsCard:{width:140,backgroundColor:"#fff",borderRadius:12,padding:16,marginHorizontal:8,elevation:2,shadowColor:"#000",shadowOffset:{width:0,height:1},shadowOpacity:0.1,shadowRadius:2,borderLeftWidth:4},
  statsHeader:{flexDirection:"row",alignItems:"center",marginBottom:8},
  statsIcon:{width:40,height:40,borderRadius:20,justifyContent:"center",alignItems:"center",marginRight:12},
  statsTitle:{fontSize:12,color:"#666",fontWeight:"500"},
  statsValue:{fontSize:28,fontWeight:"bold"},
  filterContainer:{backgroundColor:"#fff",paddingVertical:12,paddingHorizontal:16,borderBottomWidth:1,borderBottomColor:"#eee"},
  filterTab:{flexDirection:"row",alignItems:"center",paddingHorizontal:16,paddingVertical:8,marginRight:12,borderRadius:20,backgroundColor:"#f5f5f5"},
  activeFilterTab:{backgroundColor:"#6200EE"},
  filterText:{fontSize:14,fontWeight:"600",color:"#666"},
  activeFilterText:{color:"#fff"},
  filterCount:{backgroundColor:"#fff",borderRadius:10,paddingHorizontal:6,paddingVertical:2,marginLeft:6},
  filterCountText:{fontSize:12,fontWeight:"bold",color:"#6200EE"},
  listContainer:{padding:16,paddingBottom:32},
  listHeader:{marginBottom:16},
  listTitle:{fontSize:18,fontWeight:"bold",color:"#333"},
  floatingButton:{position:"absolute",bottom:20,right:20,flexDirection:"row",alignItems:"center",backgroundColor:"#6200EE",paddingHorizontal:20,paddingVertical:14,borderRadius:30,elevation:8,shadowColor:"#000",shadowOffset:{width:0,height:2},shadowOpacity:0.25,shadowRadius:4,gap:8},
  floatingButtonText:{color:"#fff",fontSize:16,fontWeight:"600"},
  orderCard:{backgroundColor:"#fff",borderRadius:12,padding:16,marginBottom:12,elevation:2,shadowColor:"#000",shadowOffset:{width:0,height:1},shadowOpacity:0.1,shadowRadius:2},
  orderHeader:{marginBottom:12},
  orderTitleContainer:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:4},
  orderTitle:{fontSize:17,fontWeight:"bold",color:"#333",flex:1},
  statusBadge:{paddingHorizontal:10,paddingVertical:4,borderRadius:12},
  statusText:{fontSize:11,fontWeight:"bold"},
  orderDate:{fontSize:12,color:"#999"},
  orderDetails:{marginBottom:12},
  detailRow:{flexDirection:"row",alignItems:"center",marginBottom:6,gap:8},
  detailText:{fontSize:14,color:"#666",flex:1},
  totalText:{fontSize:15,fontWeight:"bold",color:"#333"},
  orderActions:{flexDirection:"row",flexWrap:"wrap",gap:8},
  approveBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",backgroundColor:"#4CAF50",paddingHorizontal:12,paddingVertical:8,borderRadius:8,gap:6,minWidth:100},
  rejectBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",backgroundColor:"#F44336",paddingHorizontal:12,paddingVertical:8,borderRadius:8,gap:6,minWidth:100},
  deliverBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",backgroundColor:"#2196F3",paddingHorizontal:12,paddingVertical:8,borderRadius:8,gap:6,minWidth:130},
  confirmPaymentBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",backgroundColor:"#27ae60",paddingHorizontal:12,paddingVertical:8,borderRadius:8,gap:6,minWidth:140},
  receiptBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",backgroundColor:"#9b59b6",paddingHorizontal:12,paddingVertical:8,borderRadius:8,gap:6,minWidth:120},
  actionBtnText:{color:"#fff",fontSize:13,fontWeight:"600"},
  detailsBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",backgroundColor:"#f3e5f5",paddingHorizontal:12,paddingVertical:8,borderRadius:8,gap:6,minWidth:100},
  detailsBtnText:{color:"#6200EE",fontSize:13,fontWeight:"600"},
  emptyContainer:{alignItems:"center",justifyContent:"center",paddingTop:60},
  emptyTitle:{fontSize:20,fontWeight:"bold",color:"#666",marginTop:16,marginBottom:8},
  emptyText:{fontSize:15,color:"#999",textAlign:"center",marginBottom:24,width:"80%"},
  modalOverlay:{flex:1,backgroundColor:"rgba(0,0,0,0.5)",justifyContent:"flex-end"},
  modalContainer:{backgroundColor:"#fff",borderTopLeftRadius:20,borderTopRightRadius:20,maxHeight:height*0.9},
  modalHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",padding:20,borderBottomWidth:1,borderBottomColor:"#eee"},
  modalTitle:{fontSize:20,fontWeight:"bold",color:"#333"},
  modalContent:{padding:20},
  inputGroup:{marginBottom:16},
  inputLabel:{fontSize:14,fontWeight:"600",color:"#333",marginBottom:8},
  inputHelp:{fontSize:12,color:"#666",marginBottom:8},
  input:{borderWidth:1,borderColor:"#ddd",borderRadius:8,padding:12,fontSize:16,backgroundColor:"#f9f9f9"},
  textArea:{minHeight:80,textAlignVertical:"top"},
  paymentSummary:{alignItems:"center",marginBottom:20},
  summaryTitle:{fontSize:18,fontWeight:"bold",color:"#333",marginBottom:8,textAlign:"center"},
  paymentAmount:{fontSize:20,color:"#6200EE",fontWeight:"bold",marginBottom:16},
  infoNote:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"#e8f4fd",padding:10,borderRadius:6,marginTop:8},
  infoNoteText:{fontSize:14,color:"#3498db",flex:1},
  infoBox:{flexDirection:"row",alignItems:"flex-start",gap:10,padding:16,backgroundColor:"#fff8e1",borderRadius:8,marginTop:10,borderWidth:1,borderColor:"#ffeaa7"},
  infoText:{flex:1,fontSize:14,color:"#f39c12"},
  confirmationSteps:{backgroundColor:"#f8f9fa",padding:16,borderRadius:8,marginTop:16},
  stepsTitle:{fontSize:14,fontWeight:"bold",color:"#333",marginBottom:10},
  stepItem:{flexDirection:"row",alignItems:"center",gap:8,marginBottom:8},
  stepText:{fontSize:13,color:"#666",flex:1},
  modalFooter:{flexDirection:"row",padding:20,borderTopWidth:1,borderTopColor:"#eee",gap:12},
  cancelButton:{flex:1,padding:16,backgroundColor:"#f5f5f5",borderRadius:8,alignItems:"center"},
  cancelButtonText:{color:"#666",fontSize:16,fontWeight:"600"},
  submitButton:{flex:2,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,padding:16,backgroundColor:"#6200EE",borderRadius:8},
  confirmPaymentButton:{flex:2,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,padding:16,backgroundColor:"#27ae60",borderRadius:8},
  submitButtonDisabled:{backgroundColor:"#b39ddb",opacity:0.7},
  submitButtonText:{color:"#fff",fontSize:16,fontWeight:"600"},
  row:{flexDirection:"row",marginBottom:16},
  totalSection:{alignItems:"center",backgroundColor:"#f3e5f5",padding:16,borderRadius:8,marginTop:8},
  totalLabel:{fontSize:14,color:"#666",marginBottom:4},
  totalAmount:{fontSize:24,fontWeight:"bold",color:"#6200EE"},
  orderSummary:{alignItems:"center",marginBottom:20},
  summaryTitle:{fontSize:22,fontWeight:"bold",color:"#333",marginBottom:12,textAlign:"center"},
  statusBadgeLarge:{paddingHorizontal:16,paddingVertical:8,borderRadius:20},
  statusTextLarge:{fontSize:14,fontWeight:"bold"},
  detailsSection:{backgroundColor:"#f8f9fa",padding:16,borderRadius:8,marginBottom:20},
  paymentDetailsSection:{backgroundColor:"#e8f5e9",padding:16,borderRadius:8,marginTop:16},
  detailItem:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:12},
  detailLabel:{fontSize:14,color:"#666",fontWeight:"500"},
  detailValue:{fontSize:14,color:"#333",fontWeight:"600"},
  updateSection:{marginTop:8},
  sectionTitle:{fontSize:16,fontWeight:"bold",color:"#333",marginBottom:16},
  statusButtons:{flexDirection:"row",gap:12},
  approveButtonLarge:{flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,padding:16,backgroundColor:"#4CAF50",borderRadius:8},
  rejectButtonLarge:{flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,padding:16,backgroundColor:"#F44336",borderRadius:8},
  deliverButtonLarge:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,padding:16,backgroundColor:"#2196F3",borderRadius:8},
  confirmPaymentButtonLarge:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,padding:16,backgroundColor:"#27ae60",borderRadius:8},
  statusButtonText:{color:"#fff",fontSize:16,fontWeight:"600"},
});