import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Linking,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function FinanceScreen({ navigation }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(-SCREEN_WIDTH))[0];

  const toggleDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: drawerOpen ? -SCREEN_WIDTH : 0,
      duration: 300,
      useNativeDriver: false
    }).start(() => setDrawerOpen(!drawerOpen));
  };

  const goHome = () => toggleDrawer();

  const handleContact = (type) => {
    if (type === "email") {
      Linking.openURL("mailto:support@fanakaarts.com");
    } else if (type === "phone") {
      Linking.openURL("tel:+254700000000");
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          await AsyncStorage.clear(); // clear saved tokens/data
          navigation.replace("Login"); // navigate to Login screen
        }
      }
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer}>
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Finance Dashboard</Text>

        <TouchableOpacity
          style={{ marginLeft: "auto" }}
          onPress={() => navigation.navigate("EmployeeInboxScreen")}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <ScrollView style={styles.container}>
        {/* ABOUT */}
        <View style={[styles.aboutCard, { backgroundColor: "#ff9a9e" }]}>
          <Text style={styles.aboutTitle}>Fanaka Arts</Text>
          <Text style={styles.aboutText}>
            Fanaka Arts is a creative theatre platform that manages plays,
            ticket sales, payments, and audience engagement through a secure
            digital system.
          </Text>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.quickActions}>
          <QuickButton
            icon="ticket-outline"
            label="Tickets"
            color="#fbc2eb"
            onPress={() => navigation.navigate("Tickets")}
          />
          <QuickButton
            icon="cube-outline"
            label="Inventory Orders"
            color="#a6c1ee"
            onPress={() => navigation.navigate("InventoryOrders")}
          />
          <QuickButton
            icon="chatbubble-ellipses-outline"
            label="Messages"
            color="#ffecd2"
            onPress={() => navigation.navigate("EmployeeInboxScreen")}
          />
        </View>

        {/* CONTACT US */}
        <View style={[styles.contactCard, { backgroundColor: "#cfd9df" }]}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => handleContact("email")}
          >
            <Ionicons name="mail-outline" size={20} color="#fff" />
            <Text style={styles.contactText}>Email: support@fanakaarts.com</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: "#6200EE" }]}
            onPress={() => handleContact("phone")}
          >
            <Ionicons name="call-outline" size={20} color="#fff" />
            <Text style={styles.contactText}>Call: +254 700 000000</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* OVERLAY */}
      {drawerOpen && <TouchableOpacity style={styles.overlay} onPress={toggleDrawer} />}

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
          icon="chatbubble-ellipses-outline"
          label="Messages"
          onPress={() => {
            toggleDrawer();
            navigation.navigate("EmployeeInboxScreen");
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
const QuickButton = ({ icon, label, onPress, color }) => (
  <TouchableOpacity style={[styles.quickCard, { backgroundColor: color }]} onPress={onPress}>
    <Ionicons name={icon} size={28} color="#fff" />
    <Text style={[styles.quickText, { color: "#fff" }]}>{label}</Text>
  </TouchableOpacity>
);

/* DRAWER ITEM */
const DrawerItem = ({ icon, label, onPress, danger }) => (
  <TouchableOpacity style={styles.drawerItem} onPress={onPress}>
    <Ionicons name={icon} size={22} color={danger ? "#e94560" : "#333"} />
    <Text style={[styles.drawerText, danger && { color: "#e94560" }]}>{label}</Text>
  </TouchableOpacity>
);

/* STYLES */
const styles = StyleSheet.create({
  header: {
    height: 60,
    backgroundColor: "#6200EE",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", marginLeft: 16 },
  container: { padding: 16, backgroundColor: "#f0f4f7" },
  aboutCard: { padding: 16, borderRadius: 18, marginBottom: 16 },
  aboutTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  aboutText: { marginTop: 6, lineHeight: 20, color: "#fff" },
  quickActions: { flexDirection: "row", gap: 12, marginBottom: 16 },
  quickCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: "center"
  },
  quickText: { marginTop: 6, fontWeight: "bold" },
  contactCard: {
    padding: 20,
    borderRadius: 18,
    marginTop: 16
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#FF6F61",
    gap: 10
  },
  contactText: { color: "#fff", fontWeight: "bold" },
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
  drawerItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 },
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
