import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const API_ENDPOINTS = {
    audience: "http://192.168.0.103:5000/api/users/login",
    employee: "http://192.168.0.103:5000/api/employees/login",
    actor: "http://192.168.0.103:5000/api/actors/login",
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Information", "Please enter both email and password.");
      return;
    }

    setLoading(true);

    const tryLogin = async (url) => {
      try {
        return await axios.post(url, { email, password });
      } catch {
        return null;
      }
    };

    try {
      // 1️⃣ Audience login
      const audienceRes = await tryLogin(API_ENDPOINTS.audience);
      if (audienceRes?.data?.user) {
        const user = audienceRes.data.user;
        if (user.status !== "Active") {
          Alert.alert("Account Locked", "Your audience account is inactive.");
          setLoading(false);
          return;
        }

        await AsyncStorage.multiSet([
          ["token", audienceRes.data.token || ""],
          ["userType", "audience"],
          ["userName", user.fullName],
        ]);

        Alert.alert(
          "Welcome",
          `Enjoy the show, ${user.fullName}!`,
          [{ text: "Continue", onPress: () => navigation.replace("Home") }]
        );
        setLoading(false);
        return;
      }

      // 2️⃣ Employee login
      const employeeRes = await tryLogin(API_ENDPOINTS.employee);
      if (employeeRes?.data?.employee) {
        const emp = employeeRes.data.employee;

        await AsyncStorage.multiSet([
          ["token", employeeRes.data.token || ""],
          ["userName", emp.fullName],
          ["employeeId", emp._id],
        ]);

        let screenName = "";
        let userType = "";

        // Map departments to screens
        switch (emp.department?.toLowerCase()) {
          case "production":
            screenName = "PlayManagerHome";
            userType = "manager";
            break;
          case "marketing":
            screenName = "InventoryHome";
            userType = "inventory";
            break;
          case "finance":
            screenName = "FinanceHome";
            userType = "finance";
            break;
          case "supplier":  // ✅ ADDED SUPPLIER DEPARTMENT
            screenName = "SupplierHome";
            userType = "supplier";
            break;
          default:
            Alert.alert("Access Denied", "Your department doesn't have system privileges.");
            setLoading(false);
            return;
        }

        await AsyncStorage.setItem("userType", userType);

        // Custom welcome messages for each department
        let welcomeMessage = "";
        switch (emp.department?.toLowerCase()) {
          case "production":
            welcomeMessage = `Play Manager ${emp.fullName}`;
            break;
          case "marketing":
            welcomeMessage = `Inventory Officer ${emp.fullName}`;
            break;
          case "finance":
            welcomeMessage = `Finance Officer ${emp.fullName}`;
            break;
          case "supplier":  // ✅ ADDED SUPPLIER WELCOME
            welcomeMessage = `Supplier ${emp.fullName}`;
            break;
          default:
            welcomeMessage = `${emp.fullName}`;
        }

        Alert.alert(
          "Welcome",
          welcomeMessage,
          [{ text: "Continue", onPress: () => navigation.replace(screenName) }]
        );
        setLoading(false);
        return;
      }

      // 3️⃣ Actor login
      const actorRes = await tryLogin(API_ENDPOINTS.actor);
      if (actorRes?.data?.actor) {
        const actor = actorRes.data.actor;
        if (actor.status !== "Active") {
          Alert.alert("Account Locked", "Your actor account is inactive.");
          setLoading(false);
          return;
        }

        await AsyncStorage.multiSet([
          ["token", actorRes.data.token || ""],
          ["userType", "actor"],
          ["actorId", actor._id],
          ["userName", actor.stageName || actor.fullName],
        ]);

        Alert.alert(
          "Break a Leg!",
          `Welcome ${actor.stageName || actor.fullName}`,
          [{ text: "Continue", onPress: () => navigation.replace("ActorHome", { actorId: actor._id }) }]
        );
        setLoading(false);
        return;
      }

      // 4️⃣ If all failed
      Alert.alert("Login Failed", "Incorrect email or password.");

    } catch (err) {
      console.log("Login Error:", err.response?.data || err);
      Alert.alert("Server Error", err.response?.data?.message || "Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // For testing purposes - Prefill supplier credentials
  const fillSupplierCredentials = () => {
    setEmail("supplier@gmail.com");
    setPassword("supplier123"); // Use the actual password you set
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Icon name="theater" size={60} color="#e94560" />
          </View>
          <Text style={styles.appName}>Fanaka Arts</Text>
          <Text style={styles.tagline}>Where Stories Come Alive</Text>
        </View>

        {/* FOR TESTING - Quick login buttons (Remove in production) */}
        <View style={styles.testButtonsContainer}>
          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: "#6200EE" }]} 
            onPress={fillSupplierCredentials}
          >
            <Text style={styles.testButtonText}>Supplier Login (Test)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>

          <View style={styles.inputContainer}>
            <Icon name="email-outline" size={24} color="#8a8d93" />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#8a8d93"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock-outline" size={24} color="#8a8d93" />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#8a8d93"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Icon name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#8a8d93" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate("Register")}
            disabled={loading}
          >
            <Icon name="account-plus-outline" size={24} color="#e94560" />
            <Text style={styles.registerButtonText}>Create New Account</Text>
          </TouchableOpacity>

          {/* Department Info (for demo purposes) */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              <Text style={styles.bold}>Available Departments:</Text>{" "}
              Production, Marketing, Finance, Supplier, Actor
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#16213e" },
  scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20 },
  logoContainer: { alignItems: "center", marginBottom: 30 },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(233,69,96,0.3)",
  },
  appName: { fontSize: 32, fontWeight: "bold", color: "#fff", marginBottom: 8 },
  tagline: { fontSize: 16, color: "rgba(255,255,255,0.7)", fontStyle: "italic" },
  // Test buttons (remove in production)
  testButtonsContainer: {
    marginBottom: 20,
  },
  testButton: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  testButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  formContainer: { backgroundColor: "#fff", borderRadius: 25, padding: 25, elevation: 5 },
  welcomeText: { fontSize: 28, fontWeight: "bold", color: "#1a1a2e" },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 30 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    height: 60,
  },
  input: { flex: 1, fontSize: 16, color: "#333" },
  loginButton: { 
    borderRadius: 15, 
    height: 60, 
    marginBottom: 20, 
    backgroundColor: "#e94560", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  loginButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 18,
    borderWidth: 2,
    borderColor: "#e94560",
  },
  registerButtonText: { color: "#e94560", fontSize: 16, fontWeight: "bold", marginLeft: 10 },
  infoContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#6200EE",
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  bold: {
    fontWeight: "bold",
    color: "#333",
  },
});

export default LoginScreen;