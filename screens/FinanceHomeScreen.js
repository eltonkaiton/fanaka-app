import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;
const API = "http://192.168.0.103:5000";

export default function FinanceScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [orderCounts, setOrderCounts] = useState({ pending: 0, paid: 0 });
  const [revenuePerItem, setRevenuePerItem] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  const slideAnim = useState(new Animated.Value(-SCREEN_WIDTH))[0];

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const [revenueRes, countsRes, perItemRes] = await Promise.all([
        axios.get(`${API}/orders/finance/total-revenue`),
        axios.get(`${API}/orders/finance/order-counts`),
        axios.get(`${API}/orders/finance/revenue-per-item`)
      ]);

      setTotalRevenue(revenueRes.data.totalRevenue || 0);
      setOrderCounts(countsRes.data || { pending: 0, paid: 0 });
      setRevenuePerItem(perItemRes.data || {});
    } catch {
      Alert.alert("Error", "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const toggleDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: drawerOpen ? -SCREEN_WIDTH : 0,
      duration: 300,
      useNativeDriver: false
    }).start(() => setDrawerOpen(!drawerOpen));
  };

  const goHome = () => toggleDrawer();

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          await AsyncStorage.clear();
          navigation.replace("Login");
        }
      }
    ]);
  };

  const renderRevenueItem = ({ item }) => (
    <View style={styles.itemRow}>
      <Text style={styles.itemName}>{item[0]}</Text>
      <Text style={styles.itemRevenue}>KES {item[1].toLocaleString()}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6200EE" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer}>
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finance Dashboard</Text>
      </View>

      {/* CONTENT */}
      <ScrollView style={styles.container}>
        {/* ABOUT */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>Fanaka Arts</Text>
          <Text style={styles.aboutText}>
            Fanaka Arts is a creative theatre platform that manages plays,
            ticket sales, payments, and audience engagement through a secure
            digital system.
          </Text>
        </View>

        {/* TOTAL REVENUE */}
        <View style={styles.mainCard}>
          <Text style={styles.label}>Total Revenue</Text>
          <Text style={styles.amount}>KES {totalRevenue.toLocaleString()}</Text>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.quickActions}>
          <QuickButton
            icon="ticket-outline"
            label="Tickets"
            onPress={() => navigation.navigate("Tickets")}
          />
          <QuickButton
            icon="cube-outline"
            label="Inventory Orders"
            onPress={() => navigation.navigate("InventoryOrders")}
          />
        </View>

        {/* COUNTS */}
        <View style={styles.row}>
          <View style={styles.smallCard}>
            <Text style={styles.label}>Pending Orders</Text>
            <Text style={styles.count}>{orderCounts.pending}</Text>
          </View>

          <View style={styles.smallCard}>
            <Text style={styles.label}>Paid Orders</Text>
            <Text style={styles.count}>{orderCounts.paid}</Text>
          </View>
        </View>

        {/* REVENUE PER ITEM */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Revenue Per Item</Text>
          {Object.keys(revenuePerItem).length === 0 ? (
            <Text>No approved payments yet</Text>
          ) : (
            <FlatList
              data={Object.entries(revenuePerItem)}
              keyExtractor={(item) => item[0]}
              renderItem={renderRevenueItem}
            />
          )}
        </View>
      </ScrollView>

      {/* OVERLAY */}
      {drawerOpen && (
        <TouchableOpacity style={styles.overlay} onPress={toggleDrawer} />
      )}

      {/* DRAWER */}
      <Animated.View style={[styles.drawer, { left: slideAnim }]}>
        <Text style={styles.drawerTitle}>Menu</Text>

        <DrawerItem icon="home-outline" label="Home" onPress={goHome} />
        <DrawerItem
          icon="ticket-outline"
          label="Tickets"
          onPress={() => {
            toggleDrawer();
            navigation.navigate("Tickets");
          }}
        />
        <DrawerItem
          icon="cube-outline"
          label="Inventory Orders"
          onPress={() => {
            toggleDrawer();
            navigation.navigate("InventoryOrders");
          }}
        />
        <DrawerItem
          icon="log-out-outline"
          label="Logout"
          danger
          onPress={handleLogout}
        />
      </Animated.View>
    </View>
  );
}

/* QUICK BUTTON */
const QuickButton = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickCard} onPress={onPress}>
    <Ionicons name={icon} size={28} color="#6200EE" />
    <Text style={styles.quickText}>{label}</Text>
  </TouchableOpacity>
);

/* DRAWER ITEM */
const DrawerItem = ({ icon, label, onPress, danger }) => (
  <TouchableOpacity style={styles.drawerItem} onPress={onPress}>
    <Ionicons name={icon} size={22} color={danger ? "#e94560" : "#333"} />
    <Text style={[styles.drawerText, danger && { color: "#e94560" }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

/* STYLES */
const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    height: 60,
    backgroundColor: "#6200EE",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 16
  },

  container: { padding: 16, backgroundColor: "#f4f4f4" },

  aboutCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 16
  },

  aboutTitle: { fontSize: 18, fontWeight: "bold" },
  aboutText: { marginTop: 6, color: "#555", lineHeight: 20 },

  mainCard: {
    backgroundColor: "#6200EE",
    padding: 24,
    borderRadius: 18,
    marginBottom: 16
  },

  label: { color: "#ddd", fontSize: 14 },
  amount: { color: "#fff", fontSize: 28, fontWeight: "bold", marginTop: 8 },

  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16
  },

  quickCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    alignItems: "center"
  },

  quickText: { marginTop: 6, fontWeight: "bold" },

  row: { flexDirection: "row", gap: 12 },

  smallCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16
  },

  count: { fontSize: 22, fontWeight: "bold", marginTop: 6 },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginTop: 16
  },

  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc"
  },

  itemName: { fontSize: 15 },
  itemRevenue: { fontWeight: "bold" },

  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.75,
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 20,
    elevation: 8
  },

  drawerTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 20 },

  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12
  },

  drawerText: { fontSize: 16 },

  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.3)"
  }
});
