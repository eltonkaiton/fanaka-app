import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "http://192.168.100.164:5000";
const SOCKET_URL = "http://192.168.100.164:5000";

export default function EmployeeChatScreen() {
  const [department, setDepartment] = useState(null); // Employee's department
  const [inbox, setInbox] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  // Load employee info & join department room
  useEffect(() => {
    const init = async () => {
      const storedDept = await AsyncStorage.getItem("department");
      if (!storedDept) return;

      setDepartment(storedDept);

      // Connect socket
      socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });
      socketRef.current.emit("join", storedDept);

      socketRef.current.on("newMessage", (msg) => {
        // Refresh inbox whenever a new message arrives for this department
        fetchInbox(storedDept);
        if (selectedCustomer && msg.senderId === selectedCustomer._id) {
          fetchMessages(selectedCustomer._id, storedDept);
        }
      });

      fetchInbox(storedDept);
    };

    init();

    return () => socketRef.current?.disconnect();
  }, [selectedCustomer]);

  // Fetch inbox for department
  const fetchInbox = async (dept) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/chat/inbox/department/${dept}`);
      if (res.data.success) setInbox(res.data.inbox);
    } catch (err) {
      console.log("Inbox fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages with a specific customer
  const fetchMessages = async (customerId, dept) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/chat/messages/department/${dept}/${customerId}`
      );
      if (res.data.success) {
        setMessages(res.data.messages);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        // Mark messages as read
        await axios.patch(
          `${API_BASE_URL}/api/chat/read/department/${dept}/${customerId}`
        );
      }
    } catch (err) {
      console.log("Message fetch error:", err.message);
    }
  };

  // Send message to customer via department
  const sendMessage = async () => {
    if (!text.trim() || !selectedCustomer) return;

    const tempMsg = {
      _id: Date.now().toString(),
      senderType: "Employee",
      message: text.trim(),
    };

    setMessages((prev) => [...prev, tempMsg]);
    setText("");

    try {
      await axios.post(`${API_BASE_URL}/api/chat/send`, {
        senderId: await AsyncStorage.getItem("employeeId"),
        receiverId: selectedCustomer._id,
        senderType: "Employee",
        department,
        message: tempMsg.message,
      });

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.log("Send error:", err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6200EE" />
      </View>
    );
  }

  if (!selectedCustomer) {
    // Inbox view
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Department Inbox</Text>
        <FlatList
          data={inbox}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.customerCard}
              onPress={() => {
                setSelectedCustomer(item);
                fetchMessages(item._id, department);
              }}
            >
              <Text style={styles.customerName}>{item.fullName}</Text>
              <Text style={styles.lastMessage}>{item.lastMessage}</Text>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={{ color: "#fff" }}>{item.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 10 }}
        />
      </View>
    );
  }

  // Chat view with selected customer
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.chatTitle}>{selectedCustomer.fullName}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageBubble,
              item.senderType === "Employee" ? styles.myMessage : styles.otherMessage,
            ]}
          >
            <Text style={{ color: "#fff" }}>{item.message}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 10 }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <Text style={{ color: "#fff" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "bold", padding: 15 },
  customerCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  customerName: { fontWeight: "bold", flex: 1 },
  lastMessage: { color: "#777" },
  unreadBadge: {
    backgroundColor: "#6200EE",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  backButton: { color: "#6200EE", fontWeight: "bold" },
  chatTitle: { flex: 1, textAlign: "center", fontWeight: "bold" },
  messageBubble: {
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    maxWidth: "75%",
  },
  myMessage: { backgroundColor: "#6200EE", alignSelf: "flex-end" },
  otherMessage: { backgroundColor: "#9e9e9e", alignSelf: "flex-start" },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
  },
  sendBtn: {
    marginLeft: 10,
    backgroundColor: "#6200EE",
    paddingHorizontal: 15,
    justifyContent: "center",
    borderRadius: 20,
  },
});
