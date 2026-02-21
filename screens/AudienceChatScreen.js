import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { io } from "socket.io-client";

const API_BASE_URL = "http://192.168.100.164:5000";
const SOCKET_URL = "http://192.168.100.164:5000";

const ALLOWED_DEPARTMENTS = ["administration", "admin", "finance"];
const ALLOWED_POSITIONS = ["attendant"];

const AudienceChatScreen = () => {
  const [customerId, setCustomerId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showEmployeeList, setShowEmployeeList] = useState(true);

  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  // 🔹 INIT
  useEffect(() => {
    const init = async () => {
      const storedId = await AsyncStorage.getItem("customerId");
      if (!storedId) {
        Alert.alert("Login required");
        return;
      }
      setCustomerId(storedId);
      fetchEmployees();

      // Connect socket
      socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });
      socketRef.current.emit("join", storedId);

      socketRef.current.on("newMessage", (msg) => {
        // Only fetch if message involves selected department
        if (
          selectedEmployee &&
          msg.department === selectedEmployee.department
        ) {
          fetchMessages(selectedEmployee);
        }
      });
    };

    init();
    return () => socketRef.current?.disconnect();
  }, [selectedEmployee]);

  // 🔹 Fetch Employees
  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/employees`);
      const filtered = (res.data || []).filter((emp) => {
        const dept = (emp.department || "").toLowerCase();
        const pos = (emp.position || "").toLowerCase();
        return (
          ALLOWED_DEPARTMENTS.some((k) => dept.includes(k)) ||
          ALLOWED_POSITIONS.some((k) => pos.includes(k))
        );
      });
      setEmployees(filtered);
    } catch (err) {
      console.log("Employee fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Fetch messages by department
  const fetchMessages = async (emp) => {
    if (!customerId || !emp?.department) return;

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/chat/messages/department/${emp.department}?customerId=${customerId}`
      );

      if (res.data.success) {
        setMessages(res.data.messages);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (err) {
      console.log("Message fetch error:", err.message);
    }
  };

  // 🔹 Send message
  const sendMessage = async () => {
    if (!inputText.trim() || !selectedEmployee) return;

    const tempMessage = {
      _id: Date.now().toString(),
      senderType: "User",
      message: inputText.trim(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setInputText("");

    try {
      await axios.post(`${API_BASE_URL}/api/chat/send`, {
        senderId: customerId,
        senderType: "User",
        department: selectedEmployee.department, // Send to department
        message: tempMessage.message,
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.log("Send error:", err.message);
    }
  };

  // 🔹 Render employee card
  const renderEmployeeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.employeeCard}
      onPress={() => {
        setSelectedEmployee(item);
        setShowEmployeeList(false);
        fetchMessages(item);
      }}
    >
      <View style={styles.employeeAvatar}>
        <Text style={styles.employeeAvatarText}>{item.fullName?.charAt(0) || "E"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.employeeName}>{item.fullName}</Text>
        <Text style={styles.lastMessage}>Tap to chat ({item.department})</Text>
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
    <SafeAreaView style={styles.container}>
      {showEmployeeList ? (
        <FlatList
          data={employees}
          keyExtractor={(item) => item._id}
          renderItem={renderEmployeeItem}
          contentContainerStyle={{ padding: 20 }}
        />
      ) : (
        <>
          {/* Header */}
          <View style={styles.chatHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowEmployeeList(true);
                setSelectedEmployee(null);
                setMessages([]);
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#6200EE" />
            </TouchableOpacity>
            <Text style={styles.chatHeaderTitle}>{selectedEmployee?.fullName}</Text>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageBubble,
                  item.senderType === "User" ? styles.myMessage : styles.otherMessage,
                ]}
              >
                <Text style={{ color: "#fff" }}>{item.message}</Text>
              </View>
            )}
            contentContainerStyle={{ padding: 10 }}
          />

          {/* Input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.inputContainer}
          >
            <TextInput
              style={styles.input}
              placeholder="Type message..."
              value={inputText}
              onChangeText={setInputText}
            />
            <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </>
      )}
    </SafeAreaView>
  );
};

export default AudienceChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  chatHeaderTitle: { fontSize: 16, fontWeight: "bold", marginLeft: 10 },
  employeeCard: { flexDirection: "row", alignItems: "center", padding: 14, backgroundColor: "#fff", borderRadius: 12, marginBottom: 10 },
  employeeAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#6200EE", justifyContent: "center", alignItems: "center", marginRight: 12 },
  employeeAvatarText: { color: "#fff", fontWeight: "bold" },
  employeeName: { fontWeight: "bold" },
  lastMessage: { color: "#777", fontSize: 12 },
  messageBubble: { padding: 10, borderRadius: 10, marginVertical: 5, maxWidth: "75%" },
  myMessage: { backgroundColor: "#6200EE", alignSelf: "flex-end" },
  otherMessage: { backgroundColor: "#9e9e9e", alignSelf: "flex-start" },
  inputContainer: { flexDirection: "row", padding: 10, backgroundColor: "#fff" },
  input: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 20, paddingHorizontal: 15 },
  sendButton: { marginLeft: 10, backgroundColor: "#6200EE", width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
});
