import React, { useState, useEffect, useRef } from "react";
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
  Alert,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { io } from "socket.io-client";

const API_BASE_URL = "https://fanaka-server-1.onrender.com";
const SOCKET_URL = "https://fanaka-server-1.onrender.com";

const EmployeeChatScreen = ({ route, navigation }) => {
  const { employeeId, department, customer } = route.params;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);

  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      // Connect socket
      socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });
      socketRef.current.emit("joinDepartment", department);

      socketRef.current.on("newMessage", (msg) => {
        if (
          (msg.senderId === customer._id || msg.receiverId === customer._id) &&
          msg.department === department
        ) {
          fetchMessages();
        }
      });

      await fetchMessages();
    };

    init();

    return () => socketRef.current?.disconnect();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/chat/messages/department/${department}/${customer._id}`
      );
      if (res.data.success) {
        setMessages(res.data.messages);

        // Mark as read
        await axios.patch(
          `${API_BASE_URL}/api/chat/read/department/${department}/${customer._id}`
        );

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
      setLoading(false);
    } catch (err) {
      console.log("Message fetch error:", err.message);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const tempMsg = {
      _id: Date.now().toString(),
      senderType: "Employee",
      message: inputText.trim(),
    };

    setMessages((prev) => [...prev, tempMsg]);
    setInputText("");

    try {
      await axios.post(`${API_BASE_URL}/api/chat/send`, {
        senderId: employeeId,
        receiverId: customer._id,
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#6200EE" />
        </TouchableOpacity>
        <Text style={styles.chatHeaderTitle}>{customer.fullName}</Text>
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
    </SafeAreaView>
  );
};

export default EmployeeChatScreen;

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
  sendButton: {
    marginLeft: 10,
    backgroundColor: "#6200EE",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});