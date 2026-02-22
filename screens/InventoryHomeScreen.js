import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, RefreshControl, ScrollView, Modal, TextInput, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function InventoryHomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [plays, setPlays] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");
  const [inventoryItems, setInventoryItems] = useState([]);
  const [orders, setOrders] = useState([]); // Initialize as empty array
  const [modalVisible, setModalVisible] = useState(false);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "", quantity: "", minThreshold: "", unit: "" });
  const [orderData, setOrderData] = useState({ itemId: "", itemName: "", quantity: "", supplier: "" });

  const formatMaterials = (materials) => {
    if (!materials || !Array.isArray(materials)) return 'No materials';
    return materials.map(material => {
      if (material && typeof material === 'object') return material.name || material.title || material.materialName || JSON.stringify(material);
      return material;
    }).join(', ');
  };

  const extractMaterialNames = (materials) => {
    if (!materials || !Array.isArray(materials)) return [];
    return materials.map(material => {
      if (material && typeof material === 'object') return material.name || material.title || material.materialName;
      return material;
    }).filter(name => name && name !== 'object Object');
  };

  const extractMaterialsWithQuantities = (materials) => {
    if (!materials || !Array.isArray(materials)) return [];
    return materials.map(material => ({
      name: material?.name || material?.title || material?.materialName || material,
      quantity: material?.quantity || 1,
      unit: material?.unit || 'pcs'
    }));
  };

  const fetchAllPlaysWithMaterials = async () => {
    try {
      const res = await axios.get("http://192.168.100.164:5000/api/plays");
      const playsWithMaterials = res.data.map(p => ({
        ...p,
        materialRequests: p.materialRequests?.map(req => ({
          ...req,
          formattedMaterials: formatMaterials(req.materials),
          materialNames: extractMaterialNames(req.materials),
          materialsWithQuantities: extractMaterialsWithQuantities(req.materials)
        })) || []
      })).filter(p => p.materialRequests.length > 0);
      setPlays(playsWithMaterials);
    } catch (err) {
      console.log("Fetch Plays Error:", err.response?.data || err);
      Alert.alert("Error", "Unable to load material requests.");
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const res = await axios.get("http://192.168.100.164:5000/api/items");
      setInventoryItems(res.data || []);
    } catch (err) {
      console.log("Fetch Items Error:", err.response?.data || err);
      Alert.alert("Error", "Unable to load inventory items.");
      setInventoryItems([]); // Ensure it's always an array
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get("http://192.168.100.164:5000/api/orders");
      // Check the structure of the response
      console.log("Orders API Response:", res.data);
      
      if (res.data && res.data.orders) {
        // If response has nested orders array
        setOrders(res.data.orders || []);
      } else if (Array.isArray(res.data)) {
        // If response is directly an array
        setOrders(res.data || []);
      } else {
        console.log("Unexpected orders format:", res.data);
        setOrders([]);
      }
    } catch (err) {
      console.log("Fetch Orders Error:", err.response?.data || err);
      Alert.alert("Error", "Unable to load orders.");
      setOrders([]); // Ensure it's always an array
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAllPlaysWithMaterials(), 
        fetchInventoryItems(), 
        fetchOrders()
      ]);
    } catch (err) {
      console.log("Load Data Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { 
    loadAllData(); 
  }, []);

  const onRefresh = () => { 
    setRefreshing(true); 
    loadAllData(); 
  };

  const checkInventoryAvailability = async (materialsWithQuantities) => {
    try {
      const inventoryRes = await axios.get("http://192.168.100.164:5000/api/items");
      const inventory = inventoryRes.data || [];
      const insufficientItems = [];
      materialsWithQuantities.forEach(requestedMaterial => {
        const inventoryItem = inventory.find(item =>
          item.name.toLowerCase().includes(requestedMaterial.name.toLowerCase()) ||
          requestedMaterial.name.toLowerCase().includes(item.name.toLowerCase())
        );
        if (!inventoryItem) insufficientItems.push(`${requestedMaterial.name} (not in inventory)`);
        else if (inventoryItem.quantity < requestedMaterial.quantity) insufficientItems.push(`${requestedMaterial.name} (need ${requestedMaterial.quantity}, have ${inventoryItem.quantity})`);
      });
      return insufficientItems;
    } catch (error) {
      console.log("Check inventory error:", error);
      return [];
    }
  };

  const markAsProcessing = async (playId, requestId, materialsWithQuantities) => {
    try {
      const insufficientItems = await checkInventoryAvailability(materialsWithQuantities);
      if (insufficientItems.length > 0) {
        Alert.alert("Inventory Alert", `The following items are insufficient:\n\n${insufficientItems.join('\n')}\n\nPlease restock inventory or create purchase orders first.`, [{ text: "Cancel", style: "cancel" }, { text: "Add to Inventory", onPress: () => setModalVisible(true) }]);
        return;
      }
      Alert.alert("Confirm Processing", "Are you sure you want to mark these materials as processing? This will reserve them from inventory.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Process", style: "default", onPress: async () => {
            try {
              await axios.patch(`http://192.168.100.164:5000/api/plays/${playId}/material-requests/${requestId}/processing`);
              Alert.alert("Success", "Materials marked as processing.");
              loadAllData();
            } catch (err) {
              console.log("Processing Error:", err.response?.data || err);
              Alert.alert("Error", "Could not update status.");
            }
          }
        }
      ]);
    } catch (err) {
      console.log("Processing Error:", err.response?.data || err);
      Alert.alert("Error", "Could not check inventory.");
    }
  };

  const markAsPrepared = async (playId, requestId, materialsWithQuantities) => {
    try {
      Alert.alert("Confirm Preparation", "Are you sure you want to mark these materials as prepared? This will deduct them from inventory.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Prepare", style: "default", onPress: async () => {
            try {
              await axios.patch(`http://192.168.100.164:5000/api/plays/${playId}/material-requests/${requestId}/prepare`);
              await deductMaterialsFromInventory(materialsWithQuantities);
              Alert.alert("Success", "Materials marked as prepared and deducted from inventory.");
              loadAllData();
            } catch (err) {
              console.log("Prepare Error:", err.response?.data || err);
              Alert.alert("Error", "Could not update status or deduct from inventory.");
            }
          }
        }
      ]);
    } catch (err) {
      console.log("Prepare Error:", err.response?.data || err);
      Alert.alert("Error", "Could not update status.");
    }
  };

  const deductMaterialsFromInventory = async (materialsWithQuantities) => {
    try {
      const inventoryRes = await axios.get("http://192.168.100.164:5000/api/items");
      const inventory = inventoryRes.data || [];
      const deductionPromises = materialsWithQuantities.map(async (requestedMaterial) => {
        const inventoryItem = inventory.find(item =>
          item.name.toLowerCase().includes(requestedMaterial.name.toLowerCase()) ||
          requestedMaterial.name.toLowerCase().includes(item.name.toLowerCase())
        );
        if (inventoryItem) {
          const newQuantity = Math.max(0, inventoryItem.quantity - requestedMaterial.quantity);
          await axios.put(`http://192.168.100.164:5000/api/items/${inventoryItem._id}`, { ...inventoryItem, quantity: newQuantity });
        }
      });
      await Promise.all(deductionPromises);
    } catch (error) {
      console.log("Deduction error:", error);
      throw error;
    }
  };

  const addNewItem = async () => {
    if (!newItem.name || !newItem.category || !newItem.quantity || !newItem.unit) {
      Alert.alert("Validation Error", "Please fill all required fields");
      return;
    }
    try {
      await axios.post("http://192.168.100.164:5000/api/items", newItem);
      Alert.alert("Success", "Item added successfully");
      setModalVisible(false);
      setNewItem({ name: "", category: "", quantity: "", minThreshold: "", unit: "" });
      fetchInventoryItems();
    } catch (err) {
      console.log("Add Item Error:", err.response?.data || err);
      Alert.alert("Error", "Failed to add item.");
    }
  };

  const createOrder = async () => {
    if (!orderData.itemId || !orderData.quantity || !orderData.supplier) {
      Alert.alert("Validation Error", "Please fill all fields");
      return;
    }
    try {
      const orderPayload = {
        ...orderData,
        unitCost: 0, // Add default unit cost
        totalCost: 0 // Add default total cost
      };
      await axios.post("http://192.168.100.164:5000/inventory/orders", orderPayload);
      Alert.alert("Success", "Order created successfully");
      setOrderModalVisible(false);
      setOrderData({ itemId: "", itemName: "", quantity: "", supplier: "" });
      fetchOrders();
      fetchInventoryItems();
    } catch (err) {
      console.log("Create Order Error:", err.response?.data || err);
      Alert.alert("Error", "Failed to create order.");
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("userType");
    navigation.replace("Login");
  };

  const DashboardCard = ({ icon, title, value, color, onPress }) => (
    <TouchableOpacity style={[styles.card, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardValue}>{value}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardLink}>View Details</Text>
        <Ionicons name="arrow-forward" size={16} color={color} />
      </View>
    </TouchableOpacity>
  );

  const getDashboardCounts = () => ({
    approvedCount: plays.reduce((acc, play) => acc + play.materialRequests.filter(req => req.status === "approved").length, 0),
    processingCount: plays.reduce((acc, play) => acc + play.materialRequests.filter(req => req.status === "processing").length, 0),
    preparedCount: plays.reduce((acc, play) => acc + play.materialRequests.filter(req => req.status === "prepared").length, 0)
  });

  const dashboardCounts = getDashboardCounts();
  
  // Safe filter for orders
  const pendingOrdersCount = Array.isArray(orders) ? orders.filter(o => o.status === "pending").length : 0;
  const lowStockItemsCount = Array.isArray(inventoryItems) ? inventoryItems.filter(item => item.quantity <= (item.minThreshold || 0)).length : 0;

  const renderDashboard = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>Inventory Dashboard</Text>
      <View style={styles.statsRow}>
        <DashboardCard 
          icon="cube-outline" 
          title="Total Items" 
          value={inventoryItems.length.toString()} 
          color="#6200EE" 
          onPress={() => setCurrentView("items")} 
        />
        <DashboardCard 
          icon="checkmark-circle-outline" 
          title="Approved" 
          value={dashboardCounts.approvedCount.toString()} 
          color="#4CAF50" 
          onPress={() => setCurrentView("approved")} 
        />
      </View>
      <View style={styles.statsRow}>
        <DashboardCard 
          icon="hourglass-outline" 
          title="Processing" 
          value={dashboardCounts.processingCount.toString()} 
          color="#FF9800" 
          onPress={() => setCurrentView("processing")} 
        />
        <DashboardCard 
          icon="checkmark-done-circle" 
          title="Prepared" 
          value={dashboardCounts.preparedCount.toString()} 
          color="#2196F3" 
          onPress={() => setCurrentView("prepared")} 
        />
      </View>
      <View style={styles.statsRow}>
        <DashboardCard 
          icon="cart-outline" 
          title="Pending Orders" 
          value={pendingOrdersCount.toString()} 
          color="#FF9800" 
          onPress={() => navigation.navigate("Order")} 
        />
        <DashboardCard 
          icon="alert-circle-outline" 
          title="Low Stock" 
          value={lowStockItemsCount.toString()} 
          color="#F44336" 
          onPress={() => setCurrentView("items")} 
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Material Requests</Text>
        {plays.slice(0, 3).map(play => {
          const playRequests = play.materialRequests.slice(0, 2);
          if (playRequests.length === 0) return null;
          return (
            <View key={play._id} style={styles.recentCard}>
              <Text style={styles.recentTitle}>{play.title}</Text>
              <Text style={styles.recentSubtitle}>{playRequests.map(req => `${req.actor?.fullName || 'Actor'}: ${req.status}`).join(', ')}</Text>
            </View>
          );
        })}
        {plays.length === 0 && (
          <View style={styles.emptyRecent}>
            <Ionicons name="cube-outline" size={40} color="#ccc" />
            <Text style={styles.emptyRecentText}>No recent material requests</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add New Item</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderMaterialRequests = () => {
    const filteredPlays = plays.filter(play => 
      play.materialRequests && 
      play.materialRequests.some(req => req.status === currentView)
    );

    return (
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Material Requests</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#6200EE" />
          </TouchableOpacity>
        </View>

        <View style={styles.statusTabs}>
          {['approved', 'processing', 'prepared'].map(status => (
            <TouchableOpacity 
              key={status} 
              style={[styles.statusTab, currentView === status && styles.activeStatusTab]} 
              onPress={() => setCurrentView(status)}
            >
              <Text style={[styles.statusTabText, currentView === status && styles.activeStatusTabText]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filteredPlays}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.playCard}>
              <Text style={styles.playTitle}>{item.title}</Text>
              <Text style={styles.playDescription}>{item.description}</Text>
              {item.materialRequests
                .filter(req => req.status === currentView)
                .map(req => (
                  <View key={req._id} style={[
                    styles.materialCard, 
                    req.status === "processing" && styles.processingCard, 
                    req.status === "prepared" && styles.preparedCard
                  ]}>
                    <View style={styles.materialHeader}>
                      <View style={styles.actorInfo}>
                        <Ionicons name="person-circle-outline" size={20} color="#6200EE" />
                        <Text style={styles.actorText}>
                          {req.actor?.fullName || req.actor?.name || 'Unknown Actor'}
                          {req.actor?.stageName ? ` (${req.actor.stageName})` : ""}
                        </Text>
                      </View>
                      <View style={[
                        styles.statusBadge, 
                        req.status === "approved" && { backgroundColor: "#4CAF5020" }, 
                        req.status === "processing" && { backgroundColor: "#FF980020" }, 
                        req.status === "prepared" && { backgroundColor: "#2196F320" }
                      ]}>
                        <Text style={[
                          styles.statusText, 
                          req.status === "approved" && { color: "#4CAF50" }, 
                          req.status === "processing" && { color: "#FF9800" }, 
                          req.status === "prepared" && { color: "#2196F3" }
                        ]}>
                          {req.status ? req.status.toUpperCase() : 'APPROVED'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.materialsList}>
                      <Ionicons name="cube-outline" size={16} color="#666" />
                      <Text style={styles.materialList}>
                        {req.formattedMaterials || formatMaterials(req.materials)}
                      </Text>
                    </View>

                    <View style={styles.actionButtons}>
                      {req.status === "approved" && (
                        <TouchableOpacity 
                          style={styles.processButton} 
                          onPress={() => markAsProcessing(item._id, req._id, req.materialsWithQuantities)}
                        >
                          <Ionicons name="hourglass-outline" size={18} color="#fff" />
                          <Text style={styles.processText}>Mark as Processing</Text>
                        </TouchableOpacity>
                      )}
                      {req.status === "processing" && (
                        <TouchableOpacity 
                          style={styles.prepareButton} 
                          onPress={() => markAsPrepared(item._id, req._id, req.materialsWithQuantities)}
                        >
                          <Ionicons name="checkmark-circle" size={18} color="#fff" />
                          <Text style={styles.prepareText}>Mark as Prepared</Text>
                        </TouchableOpacity>
                      )}
                      {req.status === "prepared" && (
                        <View style={styles.completedBadge}>
                          <Ionicons name="checkmark-done-circle" size={18} color="#2196F3" />
                          <Text style={styles.completedText}>Completed ✓</Text>
                          {req.preparedAt && (
                            <Text style={styles.timestampText}>
                              Prepared: {new Date(req.preparedAt).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                ))
              }
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="cube-outline" size={70} color="#aaa" />
              <Text style={styles.emptyTitle}>No {currentView} Material Requests</Text>
              <Text style={styles.emptyText}>
                {currentView === 'approved' 
                  ? 'Approved materials from the play manager will appear here.' 
                  : `No materials marked as ${currentView}.`
                }
              </Text>
            </View>
          }
        />
      </View>
    );
  };

  // UPDATED renderInventoryItems with currentStock and lowStockThreshold
  const renderInventoryItems = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Inventory Items</Text>
        <TouchableOpacity style={styles.addButtonSmall} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Item</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={inventoryItems}
        keyExtractor={item => item._id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, item.currentStock <= (item.lowStockThreshold || 0) && styles.lowStockCard]}>
            {/* Item Name and Current Stock */}
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={[
                styles.quantityBadge, 
                item.currentStock <= (item.lowStockThreshold || 0) && styles.lowStockBadge
              ]}>
                <Text style={styles.quantityText}>
                  Current Stock: {item.currentStock} {item.unit || 'pcs'}
                </Text>
              </View>
            </View>

            {/* Item Details */}
            <View style={styles.itemDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="pricetag-outline" size={16} color="#666" />
                <Text style={styles.detailText}>Category: {item.category || 'Uncategorized'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="alert-circle-outline" size={16} color="#666" />
                <Text style={styles.detailText}>
                  Minimum Threshold: {item.lowStockThreshold || 'Not set'}
                </Text>
              </View>
            </View>

            {/* Order More Button if Low Stock */}
            {item.currentStock <= (item.lowStockThreshold || 0) && (
              <TouchableOpacity 
                style={styles.orderButton} 
                onPress={() => { 
                  setOrderData({ 
                    itemId: item._id, 
                    itemName: item.name, 
                    quantity: "", 
                    supplier: "" 
                  }); 
                  setOrderModalVisible(true); 
                }}
              >
                <Ionicons name="cart-outline" size={18} color="#fff" />
                <Text style={styles.orderButtonText}>Order More</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="cube-outline" size={70} color="#aaa" />
            <Text style={styles.emptyTitle}>No Inventory Items</Text>
            <Text style={styles.emptyText}>Add your first inventory item by tapping "Add Item" button</Text>
          </View>
        }
      />
    </View>
  );

  const renderOrders = () => {
    const ordersArray = Array.isArray(orders) ? orders : [];
    
    return (
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Purchase Orders</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#6200EE" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={ordersArray}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderItem}>
                  {item.itemName || 'Unnamed Item'}
                </Text>
                <View style={[
                  styles.statusBadge, 
                  item.status === "delivered" || item.status === "approved" ? 
                    { backgroundColor: "#4CAF5020" } : 
                    { backgroundColor: "#FF980020" }
                ]}>
                  <Text style={[
                    styles.statusText, 
                    item.status === "delivered" || item.status === "approved" ? 
                      { color: "#4CAF50" } : 
                      { color: "#FF9800" }
                  ]}>
                    {item.status?.toUpperCase() || 'PENDING'}
                  </Text>
                </View>
              </View>
              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="cube-outline" size={16} color="#666" />
                  <Text style={styles.detailText}>Quantity: {item.quantity}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    Ordered: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown date'}
                  </Text>
                </View>
                {item.supplier && (
                  <View style={styles.detailRow}>
                    <Ionicons name="business-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>Supplier: {item.supplier}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="cart-outline" size={70} color="#aaa" />
              <Text style={styles.emptyTitle}>No Purchase Orders</Text>
              <Text style={styles.emptyText}>Create your first order from the inventory items screen</Text>
            </View>
          }
        />
      </View>
    );
  };

  const Sidebar = () => (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <Ionicons name="cube" size={32} color="#6200EE" />
        <Text style={styles.sidebarTitle}>Inventory</Text>
        <Text style={styles.sidebarSubtitle}>Management System</Text>
      </View>
      <ScrollView style={styles.sidebarMenu} showsVerticalScrollIndicator={false}>
        {["dashboard", "approved", "processing", "prepared", "items", "orderItems"].map(view => {
          const iconMap = {
            "dashboard": "home-outline",
            "approved": "checkmark-circle-outline",
            "processing": "hourglass-outline",
            "prepared": "checkmark-done-circle-outline",
            "items": "cube-outline",
            "orderItems": "cart-outline"
          };
          const titleMap = {
            "dashboard": "Dashboard",
            "approved": "Approved Requests",
            "processing": "Processing",
            "prepared": "Prepared",
            "items": "Inventory Items",
            "orderItems": "Order Items"
          };

          return (
            <TouchableOpacity
              key={view}
              style={[styles.menuItem, currentView === view && view !== "orderItems" && styles.activeMenuItem]}
              onPress={() => {
                if (view === "orderItems") {
                  navigation.navigate("Order");
                  setSidebarVisible(false);
                } else {
                  setCurrentView(view);
                  setSidebarVisible(false);
                }
              }}
            >
              <Ionicons 
                name={iconMap[view]} 
                size={22} 
                color={currentView === view && view !== "orderItems" ? "#6200EE" : "#666"} 
              />
              <Text style={[
                styles.menuText, 
                currentView === view && view !== "orderItems" && styles.activeMenuText
              ]}>
                {titleMap[view]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color="#6200EE" />
      <Text style={styles.loadingText}>Loading inventory data...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => setSidebarVisible(!sidebarVisible)}>
          <Ionicons name="menu" size={28} color="#6200EE" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentView === "dashboard" ? "Dashboard" :
            currentView === "approved" ? "Approved Requests" :
              currentView === "processing" ? "Processing" :
                currentView === "prepared" ? "Prepared" :
                  currentView === "items" ? "Inventory Items" :
                    "Dashboard"}
        </Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#6200EE" />
        </TouchableOpacity>
      </View>

      {sidebarVisible && (
        <TouchableOpacity 
          style={styles.overlay} 
          onPress={() => setSidebarVisible(false)} 
          activeOpacity={1} 
        />
      )}

      <View style={[
        styles.sidebarContainer, 
        { transform: [{ translateX: sidebarVisible ? 0 : -width * 0.8 }] }
      ]}>
        <Sidebar />
      </View>

      <View style={styles.mainContent}>
        {currentView === "dashboard" ? renderDashboard() : 
         currentView === "items" ? renderInventoryItems() : 
         currentView === "orders" ? renderOrders() : 
         renderMaterialRequests()}
      </View>

      {/* Add New Item Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Inventory Item</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Item Name *</Text>
                <TextInput 
                  style={styles.input} 
                  value={newItem.name} 
                  onChangeText={text => setNewItem({ ...newItem, name: text })} 
                  placeholder="Enter item name" 
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category *</Text>
                <TextInput 
                  style={styles.input} 
                  value={newItem.category} 
                  onChangeText={text => setNewItem({ ...newItem, category: text })} 
                  placeholder="e.g., Costume, Prop, Makeup" 
                />
              </View>
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.inputLabel}>Quantity *</Text>
                  <TextInput 
                    style={styles.input} 
                    value={newItem.quantity} 
                    onChangeText={text => setNewItem({ ...newItem, quantity: text })} 
                    placeholder="0" 
                    keyboardType="numeric" 
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <TextInput 
                    style={styles.input} 
                    value={newItem.unit} 
                    onChangeText={text => setNewItem({ ...newItem, unit: text })} 
                    placeholder="e.g., pieces, liters" 
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Minimum Threshold</Text>
                <TextInput 
                  style={styles.input} 
                  value={newItem.minThreshold} 
                  onChangeText={text => setNewItem({ ...newItem, minThreshold: text })} 
                  placeholder="Alert when below this number" 
                  keyboardType="numeric" 
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={addNewItem}>
                <Text style={styles.saveButtonText}>Save Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Place Order Modal */}
      <Modal animationType="slide" transparent={true} visible={orderModalVisible} onRequestClose={() => setOrderModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Place New Order</Text>
              <TouchableOpacity onPress={() => setOrderModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Item *</Text>
                {inventoryItems.map(item => (
                  <TouchableOpacity 
                    key={item._id} 
                    style={[
                      styles.itemCard, 
                      { 
                        marginBottom: 10, 
                        backgroundColor: orderData.itemId === item._id ? "#6200EE20" : "#f8f9fa" 
                      }
                    ]} 
                    onPress={() => setOrderData({ ...orderData, itemId: item._id, itemName: item.name })}
                  >
                    <Text style={{ fontSize: 16, color: "#333" }}>
                      {item.name} ({item.quantity} {item.unit || 'pcs'} available)
                    </Text>
                  </TouchableOpacity>
                ))}
                {inventoryItems.length === 0 && (
                  <Text style={styles.noItemsText}>No items available in inventory</Text>
                )}
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quantity *</Text>
                <TextInput 
                  style={styles.input} 
                  value={orderData.quantity} 
                  onChangeText={text => setOrderData({ ...orderData, quantity: text })} 
                  keyboardType="numeric" 
                  placeholder="Enter quantity" 
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Supplier *</Text>
                <TextInput 
                  style={styles.input} 
                  value={orderData.supplier} 
                  onChangeText={text => setOrderData({ ...orderData, supplier: text })} 
                  placeholder="Enter supplier name" 
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setOrderModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.saveButton, 
                  (!orderData.itemId || !orderData.quantity || !orderData.supplier) && styles.saveButtonDisabled
                ]} 
                onPress={createOrder}
                disabled={!orderData.itemId || !orderData.quantity || !orderData.supplier}
              >
                <Text style={styles.saveButtonText}>Place Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  loadingScreen: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8f9fa" },
  loadingText: { marginTop: 10, fontSize: 16, color: "#666" },
  topHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    backgroundColor: "#fff", 
    elevation: 3, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 3 
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: "#333" 
  },
  overlay: { 
    position: "absolute", 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: "rgba(0,0,0,0.5)", 
    zIndex: 999 
  },
  sidebarContainer: { 
    position: "absolute", 
    top: 0, 
    left: 0, 
    bottom: 0, 
    width: width * 0.8, 
    backgroundColor: "#fff", 
    zIndex: 1000, 
    elevation: 10 
  },
  sidebar: { flex: 1, backgroundColor: "#fff" },
  sidebarHeader: { 
    padding: 30, 
    backgroundColor: "#f8f9fa", 
    borderBottomWidth: 1, 
    borderBottomColor: "#eee", 
    alignItems: "center" 
  },
  sidebarTitle: { 
    fontSize: 24, 
    fontWeight: "bold", 
    color: "#333", 
    marginTop: 10 
  },
  sidebarSubtitle: { 
    fontSize: 14, 
    color: "#666", 
    marginTop: 5 
  },
  sidebarMenu: { flex: 1, paddingVertical: 20 },
  menuItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: 15, 
    paddingHorizontal: 25, 
    marginVertical: 2 
  },
  activeMenuItem: { 
    backgroundColor: "#6200EE10", 
    borderLeftWidth: 4, 
    borderLeftColor: "#6200EE" 
  },
  menuText: { 
    fontSize: 16, 
    color: "#666", 
    marginLeft: 15 
  },
  activeMenuText: { 
    color: "#6200EE", 
    fontWeight: "600" 
  },
  logoutButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#F44336", 
    margin: 20, 
    padding: 15, 
    borderRadius: 10 
  },
  logoutText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "600", 
    marginLeft: 10 
  },
  mainContent: { flex: 1 },
  content: { flex: 1, padding: 20 },
  screenTitle: { 
    fontSize: 24, 
    fontWeight: "bold", 
    color: "#333", 
    marginBottom: 20 
  },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 20 
  },
  statsRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 15 
  },
  card: { 
    flex: 1, 
    backgroundColor: "#fff", 
    borderRadius: 15, 
    padding: 20, 
    marginHorizontal: 5, 
    borderLeftWidth: 5, 
    elevation: 3, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4 
  },
  cardHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 10 
  },
  iconContainer: { 
    width: 45, 
    height: 45, 
    borderRadius: 12, 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: 12 
  },
  cardTitle: { 
    fontSize: 14, 
    color: "#666", 
    fontWeight: "500" 
  },
  cardValue: { 
    fontSize: 32, 
    fontWeight: "bold", 
    color: "#333", 
    marginBottom: 10 
  },
  cardFooter: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between" 
  },
  cardLink: { 
    fontSize: 12, 
    color: "#666" 
  },
  section: { 
    backgroundColor: "#fff", 
    borderRadius: 15, 
    padding: 20, 
    marginBottom: 20, 
    elevation: 2 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#333", 
    marginBottom: 15 
  },
  recentCard: { 
    backgroundColor: "#f8f9fa", 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 10 
  },
  recentTitle: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#333", 
    marginBottom: 5 
  },
  recentSubtitle: { 
    fontSize: 14, 
    color: "#666" 
  },
  emptyRecent: {
    alignItems: "center",
    padding: 20
  },
  emptyRecentText: {
    fontSize: 14,
    color: "#999",
    marginTop: 10
  },
  addButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#6200EE", 
    padding: 18, 
    borderRadius: 15, 
    elevation: 3 
  },
  addButtonSmall: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#6200EE", 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    borderRadius: 10 
  },
  addButtonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "600", 
    marginLeft: 8 
  },
  refreshButton: { padding: 8 },
  statusTabs: { 
    flexDirection: "row", 
    marginBottom: 20, 
    backgroundColor: "#fff", 
    borderRadius: 10, 
    padding: 5 
  },
  statusTab: { 
    flex: 1, 
    paddingVertical: 10, 
    alignItems: "center", 
    borderRadius: 8 
  },
  activeStatusTab: { 
    backgroundColor: "#6200EE" 
  },
  statusTabText: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#666" 
  },
  activeStatusTabText: { 
    color: "#fff" 
  },
  playCard: { 
    backgroundColor: "#fff", 
    borderRadius: 15, 
    padding: 20, 
    marginBottom: 15, 
    elevation: 3 
  },
  playTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: "#333", 
    marginBottom: 5 
  },
  playDescription: { 
    fontSize: 14, 
    color: "#666", 
    marginBottom: 15 
  },
  materialCard: { 
    backgroundColor: "#f8f9fa", 
    borderRadius: 12, 
    padding: 15, 
    marginBottom: 10 
  },
  processingCard: { 
    backgroundColor: "#FFF3E0", 
    borderLeftWidth: 4, 
    borderLeftColor: "#FF9800" 
  },
  preparedCard: { 
    backgroundColor: "#E3F2FD", 
    borderLeftWidth: 4, 
    borderLeftColor: "#2196F3" 
  },
  materialHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 10 
  },
  actorInfo: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  actorText: { 
    fontSize: 15, 
    fontWeight: "600", 
    color: "#333", 
    marginLeft: 8, 
    flex: 1 
  },
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 20 
  },
  statusText: { 
    fontSize: 12, 
    fontWeight: "700" 
  },
  materialsList: { 
    flexDirection: "row", 
    alignItems: "flex-start", 
    marginBottom: 10 
  },
  materialList: { 
    fontSize: 14, 
    color: "#333", 
    marginLeft: 8, 
    flex: 1, 
    lineHeight: 20 
  },
  actionButtons: { 
    marginTop: 10 
  },
  processButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#FF9800", 
    padding: 12, 
    borderRadius: 8 
  },
  processText: { 
    color: "#fff", 
    fontWeight: "600", 
    marginLeft: 8, 
    fontSize: 14 
  },
  prepareButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#4CAF50", 
    padding: 12, 
    borderRadius: 8, 
    marginTop: 5 
  },
  prepareText: { 
    color: "#fff", 
    fontWeight: "600", 
    marginLeft: 8, 
    fontSize: 14 
  },
  completedBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#E3F2FD", 
    padding: 10, 
    borderRadius: 8 
  },
  completedText: { 
    color: "#2196F3", 
    fontWeight: "600", 
    marginLeft: 8, 
    fontSize: 14 
  },
  timestampText: { 
    fontSize: 12, 
    color: "#666", 
    marginTop: 4 
  },
  itemCard: { 
    backgroundColor: "#fff", 
    borderRadius: 12, 
    padding: 15, 
    marginBottom: 10, 
    elevation: 2 
  },
  lowStockCard: { 
    borderLeftWidth: 4, 
    borderLeftColor: "#F44336" 
  },
  itemHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 10 
  },
  itemName: { 
    fontSize: 17, 
    fontWeight: "600", 
    color: "#333", 
    flex: 1 
  },
  quantityBadge: { 
    backgroundColor: "#e3f2fd", 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20 
  },
  lowStockBadge: { 
    backgroundColor: "#ffebee" 
  },
  quantityText: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#1976d2" 
  },
  itemDetails: { 
    marginBottom: 10 
  },
  detailRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 5 
  },
  detailText: { 
    fontSize: 14, 
    color: "#666", 
    marginLeft: 8 
  },
  orderButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#F44336", 
    padding: 10, 
    borderRadius: 8, 
    marginTop: 5 
  },
  orderButtonText: { 
    color: "#fff", 
    fontSize: 14, 
    fontWeight: "600", 
    marginLeft: 8 
  },
  orderCard: { 
    backgroundColor: "#fff", 
    borderRadius: 12, 
    padding: 15, 
    marginBottom: 10, 
    elevation: 2 
  },
  orderHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 10 
  },
  orderItem: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#333", 
    flex: 1 
  },
  orderDetails: { 
    marginTop: 5 
  },
  emptyBox: { 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: 50 
  },
  emptyTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: "#666", 
    marginTop: 15, 
    marginBottom: 5 
  },
  emptyText: { 
    fontSize: 15, 
    color: "#999", 
    textAlign: "center", 
    width: "80%" 
  },
  noItemsText: {
    textAlign: "center",
    color: "#999",
    padding: 20,
    fontSize: 14
  },
  modalContainer: { 
    flex: 1, 
    justifyContent: "flex-end", 
    backgroundColor: "rgba(0,0,0,0.5)" 
  },
  modalContent: { 
    backgroundColor: "#fff", 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    maxHeight: "80%" 
  },
  modalHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: "#eee" 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: "#333" 
  },
  modalForm: { 
    padding: 20 
  },
  inputGroup: { 
    marginBottom: 20 
  },
  row: { 
    flexDirection: "row", 
    marginBottom: 20 
  },
  inputLabel: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#333", 
    marginBottom: 8 
  },
  input: { 
    borderWidth: 1, 
    borderColor: "#ddd", 
    borderRadius: 10, 
    padding: 12, 
    fontSize: 16, 
    backgroundColor: "#f9f9f9" 
  },
  modalFooter: { 
    flexDirection: "row", 
    padding: 20, 
    borderTopWidth: 1, 
    borderTopColor: "#eee" 
  },
  cancelButton: { 
    flex: 1, 
    padding: 15, 
    backgroundColor: "#f5f5f5", 
    borderRadius: 10, 
    marginRight: 10, 
    alignItems: "center" 
  },
  cancelButtonText: { 
    color: "#666", 
    fontSize: 16, 
    fontWeight: "600" 
  },
  saveButton: { 
    flex: 1, 
    padding: 15, 
    backgroundColor: "#6200EE", 
    borderRadius: 10, 
    alignItems: "center" 
  },
  saveButtonDisabled: {
    backgroundColor: "#b39ddb",
    opacity: 0.7
  },
  saveButtonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "600" 
  }
});