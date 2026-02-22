import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_BASE_URL = "https://fanaka-server-1.onrender.com";

const EmployeeInboxScreen = ({ navigation }) => {
  const [employeeId, setEmployeeId] = useState(null);
  const [department, setDepartment] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const storedId = await AsyncStorage.getItem("employeeId");
      const storedDept = await AsyncStorage.getItem("department");

      if (!storedId || !storedDept) {
        Alert.alert("Login required");
        return;
      }

      setEmployeeId(storedId);
      setDepartment(storedDept);

      await fetchInbox(storedDept);
    };

    init();
  }, []);

  const fetchInbox = async (dept) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/chat/inbox/department/${dept}`);
      setInbox(res.data.inbox || []);
    } catch (err) {
      console.log("Inbox fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderCustomerItem = ({ item }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() =>
        navigation.navigate("EmployeeChat", {
          employeeId,
          department,
          customer: item,
        })
      }
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.fullName?.charAt(0) || "C"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.customerName}>{item.fullName}</Text>
        <Text style={styles.lastMessage}>{item.lastMessage || "No messages yet"}</Text>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6200EE" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={inbox}
        keyExtractor={(item) => item._id}
        renderItem={renderCustomerItem}
        contentContainerStyle={{ padding: 20 }}
      />
    </View>
  );
};

export default EmployeeInboxScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6200EE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontWeight: "bold" },
  customerName: { fontWeight: "bold" },
  lastMessage: { color: "#777", fontSize: 12 },
  unreadBadge: {
    position: "absolute",
    right: 0,
    top: 5,
    backgroundColor: "#e94560",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unreadText: { color: "#fff", fontSize: 12 },
});