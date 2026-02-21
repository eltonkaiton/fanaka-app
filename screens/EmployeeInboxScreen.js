import React, { useState, useEffect, useRef } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { io } from "socket.io-client";

const API_BASE_URL = "http://192.168.100.164:5000";
const SOCKET_URL = "http://192.168.100.164:5000";

const EmployeeInboxScreen = () => {
  const [employeeId, setEmployeeId] = useState(null);
  const [department, setDepartment] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);

  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  // ===================== INIT =====================
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

      // 🔹 Connect socket to department room
      socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });
      socketRef.current.emit("join", storedDept); // everyone in the department joins same room

      socketRef.current.on("newMessage", (msg) => {
        // If chat open → refresh messages
        if (
          selectedCustomer &&
          (msg.senderId === selectedCustomer._id ||
            msg.receiverId === selectedCustomer._id)
        ) {
          fetchMessages(selectedCustomer);
        } else {
          fetchInbox(storedDept);
        }
      });
    };

    init();

    return () => socketRef.current?.disconnect();
  }, [selectedCustomer]);

  // ===================== FETCH INBOX =====================
  const fetchInbox = async (dept) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/chat/inbox/department/${dept}`);
      setInbox(res.data.inbox || []);
    } catch (err) {
      console.log("Inbox fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===================== FETCH MESSAGES =====================
  const fetchMessages = async (customer) => {
    if (!department || !customer?._id) return;

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/chat/messages/department/${department}/${customer._id}`
      );

      if (res.data.success) {
        setMessages(res.data.messages);

        // ✅ Mark as read
        await axios.patch(
          `${API_BASE_URL}/api/chat/read/department/${department}/${customer._id}`
        );

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (err) {
      console.log("Message fetch error:", err.message);
    }
  };

  // ===================== SEND MESSAGE =====================
  const sendMessage = async () => {
    if (!inputText.trim() || !selectedCustomer) return;

    const tempMessage = {
      _id: Date.now().toString(),
      senderType: "Employee",
      message: inputText.trim(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setInputText("");

    try {
      await axios.post(`${API_BASE_URL}/api/chat/send`, {
        senderId: employeeId,
        receiverId: selectedCustomer._id,
        senderType: "Employee",
        receiverType: "User",
        message: tempMessage.message,
        department,
      });

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.log("Send error:", err.message);
    }
  };

  // ===================== RENDER CUSTOMER =====================
  const renderCustomerItem = ({ item }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => setSelectedCustomer(item)}
    >
      <View style={styles.customerAvatar}>
        <Text style={styles.avatarText}>
          {item.fullName?.charAt(0) || "C"}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.customerName}>{item.fullName}</Text>
        <Text style={styles.lastMessage}>
          {item.lastMessage || "No messages yet"}
        </Text>

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
    <SafeAreaView style={styles.container}>
      {!selectedCustomer ? (
        <FlatList
          data={inbox}
          keyExtractor={(item) => item._id}
          renderItem={renderCustomerItem}
          contentContainerStyle={{ padding: 20 }}
        />
      ) : (
        <>
          {/* Header */}
          <View style={styles.chatHeader}>
            <TouchableOpacity
              onPress={() => {
                setSelectedCustomer(null);
                setMessages([]);
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#6200EE" />
            </TouchableOpacity>

            <Text style={styles.chatHeaderTitle}>
              {selectedCustomer?.fullName}
            </Text>
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
                  item.senderType === "Employee"
                    ? styles.myMessage
                    : styles.otherMessage,
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

export default EmployeeInboxScreen;

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
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
  },
  customerAvatar: {
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
  messageBubble: { padding: 10, borderRadius: 10, marginVertical: 5, maxWidth: "75%" },
  myMessage: { backgroundColor: "#6200EE", alignSelf: "flex-end" },
  otherMessage: { backgroundColor: "#9e9e9e", alignSelf: "flex-start" },
  inputContainer: { flexDirection: "row", padding: 10, backgroundColor: "#fff" },
  input: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 20, paddingHorizontal: 15 },
  sendButton: { marginLeft: 10, backgroundColor: "#6200EE", width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
});
