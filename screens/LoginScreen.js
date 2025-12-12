// LoginScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // YOUR BACKEND ROUTES
  const USER_API = 'http://192.168.100.13:5000/api/users/login';
  const EMPLOYEE_API = 'http://192.168.100.13:5000/api/employees/login';
  const ACTOR_API = 'http://192.168.100.13:5000/api/actors/login';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please enter both email and password.');
      return;
    }

    setLoading(true);

    // wrapper to safely call APIs
    const tryLogin = async (api, body) => {
      try {
        return await axios.post(api, body);
      } catch {
        return null;
      }
    };

    try {
      // ─────────────────────────────────────────────
      // 1️⃣ AUDIENCE LOGIN
      // ─────────────────────────────────────────────
      const audienceRes = await tryLogin(USER_API, { email, password });

      if (audienceRes?.data?.user) {
        const user = audienceRes.data.user;

        if (user.status !== "Active") {
          Alert.alert("Account Locked", "Your audience account is inactive.");
          setLoading(false);
          return;
        }

        await AsyncStorage.setItem("token", audienceRes.data.token || "");
        await AsyncStorage.setItem("userType", "audience");
        await AsyncStorage.setItem("userName", user.fullName);

        Alert.alert("Welcome", `Enjoy the show, ${user.fullName}!`);
        navigation.replace("Home");
        setLoading(false);
        return;
      }

      // ─────────────────────────────────────────────
      // 2️⃣ EMPLOYEE LOGIN (Play Manager + Inventory)
      // ─────────────────────────────────────────────
      const employeeRes = await tryLogin(EMPLOYEE_API, { email, password });

      if (employeeRes?.data?.employee) {
        const emp = employeeRes.data.employee;

        await AsyncStorage.setItem("token", employeeRes.data.token || "");
        await AsyncStorage.setItem("userName", emp.fullName);
        await AsyncStorage.setItem("employeeId", emp._id);

        // ➤ Play Manager (Production)
        if (emp.department === "Production") {
          await AsyncStorage.setItem("userType", "manager");

          Alert.alert("Welcome", `Play Manager ${emp.fullName}`);
          navigation.replace("PlayManagerHome");
          setLoading(false);
          return;
        }

        // ➤ Inventory (Marketing)
        if (emp.department === "Marketing") {
          await AsyncStorage.setItem("userType", "inventory");

          Alert.alert("Welcome", `Inventory Officer ${emp.fullName}`);
          navigation.replace("InventoryHome");
          setLoading(false);
          return;
        }

        Alert.alert("Access Denied", "Your department doesn't have system privileges.");
        setLoading(false);
        return;
      }

      // ─────────────────────────────────────────────
      // 3️⃣ ACTOR LOGIN
      // ─────────────────────────────────────────────
      const actorRes = await tryLogin(ACTOR_API, { email, password });

      if (actorRes?.data?.actor) {
        const actor = actorRes.data.actor;

        if (actor.status !== "Active") {
          Alert.alert("Account Locked", "Your actor account is inactive.");
          setLoading(false);
          return;
        }

        await AsyncStorage.setItem("token", actorRes.data.token || "");
        await AsyncStorage.setItem("userType", "actor");
        await AsyncStorage.setItem("actorId", actor._id);
        await AsyncStorage.setItem("userName", actor.stageName || actor.fullName);

        Alert.alert("Break a Leg!", `Welcome ${actor.stageName || actor.fullName}`);
        navigation.replace("ActorHome", { actorId: actor._id });
        setLoading(false);
        return;
      }

      // ─────────────────────────────────────────────
      // ❌ If all 3 login attempts fail
      // ─────────────────────────────────────────────
      Alert.alert("Login Failed", "Incorrect email or password.");
    } catch (err) {
      console.log("Login Error:", err.response?.data || err);
      Alert.alert(
        "Server Error",
        err.response?.data?.message || "Unable to connect. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          
          {/* LOGO */}
          <View style={styles.logoContainer}>
            <View style={styles.logoWrapper}>
              <Icon name="theater" size={60} color="#e94560" />
            </View>
            <Text style={styles.appName}>Fanaka Arts</Text>
            <Text style={styles.tagline}>Where Stories Come Alive</Text>
          </View>

          {/* FORM */}
          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your journey</Text>

            {/* EMAIL FIELD */}
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

            {/* PASSWORD FIELD */}
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
                <Icon 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={24} 
                  color="#8a8d93" 
                />
              </TouchableOpacity>
            </View>

            {/* LOGIN BUTTON */}
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient colors={['#e94560', '#ff6b8b']} style={styles.buttonGradient}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* REGISTER */}
            <TouchableOpacity 
              style={styles.registerButton}
              onPress={() => navigation.navigate('Register')}
              disabled={loading}
            >
              <Icon name="account-plus-outline" size={24} color="#e94560" />
              <Text style={styles.registerButtonText}>Create New Account</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

// --------------------------------------------------
// STYLES (same as before)
// --------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoWrapper: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, borderWidth: 2,
    borderColor: 'rgba(233,69,96,0.3)',
  },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 25, padding: 25, elevation: 10,
  },
  welcomeText: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 15,
    paddingHorizontal: 15, marginBottom: 20,
    borderWidth: 1, borderColor: '#e0e0e0', height: 60,
  },
  input: { flex: 1, fontSize: 16, color: '#333' },
  loginButton: {
    borderRadius: 15, overflow: 'hidden',
    height: 60, marginBottom: 20,
  },
  buttonGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  registerButton: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 18,
    borderWidth: 2,
    borderColor: '#e94560',
  },
  registerButtonText: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10
  },
});

export default LoginScreen;
