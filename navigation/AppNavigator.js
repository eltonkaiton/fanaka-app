// navigation/AppNavigator.js
import React from "react";
import { Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem
} from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* =======================
   AUTH SCREENS
======================= */
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";

/* =======================
   AUDIENCE SCREENS
======================= */
import HomeScreen from "../screens/HomeScreen";
import PlayDetailsScreen from "../screens/PlayDetailsScreen";
import ContactUsScreen from "../screens/ContactUsScreen";
import AboutUsScreen from "../screens/AboutUsScreen";
import HelpScreen from "../screens/HelpScreen";
import MyBookingsScreen from "../screens/MyBookingsScreen";

/* =======================
   PLAY MANAGER SCREENS
======================= */
import PlayManagerHomeScreen from "../screens/PlayManagerHomeScreen";
import CreatePlayScreen from "../screens/CreatePlayScreen";
import ManagePlaysScreen from "../screens/ManagePlaysScreen";
import AssignActorsScreen from "../screens/AssignActorsScreen";
import ManagerBookingsScreen from "../screens/ManagerBookingsScreen"; // ✅ ADDED

/* =======================
   ACTOR SCREEN
======================= */
import ActorHomeScreen from "../screens/ActorHomeScreen";

/* =======================
   INVENTORY SCREENS
======================= */
import InventoryHomeScreen from "../screens/InventoryHomeScreen";
import InventoryOrdersScreen from "../screens/InventoryOrdersScreen";

/* =======================
   FINANCE SCREENS
======================= */
import FinanceHomeScreen from "../screens/FinanceHomeScreen";
import TicketsScreen from "../screens/TicketsScreen";
import OrderScreen from "../screens/OrderScreen";

/* =======================
   SUPPLIER SCREEN
======================= */
import SupplierHomeScreen from "../screens/SupplierHomeScreen";

/* =======================
   NAVIGATORS
======================= */
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

/* =======================
   CUSTOM DRAWER (AUDIENCE)
======================= */
const CustomDrawerContent = (props) => {
  const { navigation } = props;

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert("Logged Out", "You have been logged out successfully");
      navigation.replace("Login");
    } catch (error) {
      Alert.alert("Error", "Failed to log out");
    }
  };

  return (
    <DrawerContentScrollView {...props}>
      <DrawerItem label="Home" onPress={() => navigation.navigate("HomeDrawer")} />
      <DrawerItem label="My Bookings" onPress={() => navigation.navigate("MyBookings")} />
      <DrawerItem label="Contact Us" onPress={() => navigation.navigate("ContactUs")} />
      <DrawerItem label="About Us" onPress={() => navigation.navigate("AboutUs")} />
      <DrawerItem label="Help" onPress={() => navigation.navigate("Help")} />
      <DrawerItem label="Logout" onPress={handleLogout} />
    </DrawerContentScrollView>
  );
};

/* =======================
   PLAY MANAGER DRAWER
======================= */
const PlayManagerDrawerContent = (props) => {
  const { navigation } = props;

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert("Logged Out", "You have been logged out successfully");
      navigation.replace("Login");
    } catch (error) {
      Alert.alert("Error", "Failed to log out");
    }
  };

  return (
    <DrawerContentScrollView {...props}>
      <DrawerItem 
        label="Dashboard" 
        onPress={() => navigation.navigate("PlayManagerHome")} 
      />
      <DrawerItem 
        label="Manage Bookings" 
        onPress={() => navigation.navigate("ManagerBookings")} 
      />
      <DrawerItem 
        label="Manage Plays" 
        onPress={() => navigation.navigate("ManagePlays")} 
      />
      <DrawerItem 
        label="Create Play" 
        onPress={() => navigation.navigate("CreatePlay")} 
      />
      <DrawerItem 
        label="Assign Actors" 
        onPress={() => navigation.navigate("AssignActors")} 
      />
      <DrawerItem label="Logout" onPress={handleLogout} />
    </DrawerContentScrollView>
  );
};

/* =======================
   SUPPLIER DRAWER
======================= */
const SupplierDrawerContent = (props) => {
  const { navigation } = props;

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert("Logged Out", "You have been logged out successfully");
      navigation.replace("Login");
    } catch (error) {
      Alert.alert("Error", "Failed to log out");
    }
  };

  return (
    <DrawerContentScrollView {...props}>
      <DrawerItem label="Dashboard" onPress={() => navigation.navigate("SupplierHome")} />
      <DrawerItem label="My Orders" onPress={() => navigation.navigate("SupplierHome")} />
      <DrawerItem label="Order Proposals" onPress={() => navigation.navigate("SupplierHome")} />
      <DrawerItem label="Profile" onPress={() => navigation.navigate("SupplierHome")} />
      <DrawerItem label="Logout" onPress={handleLogout} />
    </DrawerContentScrollView>
  );
};

/* =======================
   AUDIENCE DRAWER NAVIGATOR
======================= */
const DrawerNavigator = () => (
  <Drawer.Navigator
    initialRouteName="HomeDrawer"
    drawerContent={(props) => <CustomDrawerContent {...props} />}
    screenOptions={{
      headerStyle: { backgroundColor: "#6200EE" },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "bold" }
    }}
  >
    <Drawer.Screen name="HomeDrawer" component={HomeScreen} options={{ title: "Home" }} />
    <Drawer.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: "My Bookings" }} />
    <Drawer.Screen name="ContactUs" component={ContactUsScreen} options={{ title: "Contact Us" }} />
    <Drawer.Screen name="AboutUs" component={AboutUsScreen} options={{ title: "About Us" }} />
    <Drawer.Screen name="Help" component={HelpScreen} options={{ title: "Help & Support" }} />
  </Drawer.Navigator>
);

/* =======================
   PLAY MANAGER DRAWER NAVIGATOR
======================= */
const PlayManagerDrawerNavigator = () => (
  <Drawer.Navigator
    initialRouteName="PlayManagerHome"
    drawerContent={(props) => <PlayManagerDrawerContent {...props} />}
    screenOptions={{
      headerStyle: { backgroundColor: "#6200EE" },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "bold" }
    }}
  >
    <Drawer.Screen 
      name="PlayManagerHome" 
      component={PlayManagerHomeScreen} 
      options={{ 
        title: "Play Manager Dashboard",
        drawerLabel: "Dashboard"
      }} 
    />
    <Drawer.Screen 
      name="ManagerBookings" 
      component={ManagerBookingsScreen} 
      options={{ 
        title: "Manage Bookings",
        drawerLabel: "Manage Bookings"
      }} 
    />
    <Drawer.Screen 
      name="CreatePlay" 
      component={CreatePlayScreen} 
      options={{ 
        title: "Create New Play",
        drawerLabel: "Create Play"
      }} 
    />
    <Drawer.Screen 
      name="ManagePlays" 
      component={ManagePlaysScreen} 
      options={{ 
        title: "Manage Plays",
        drawerLabel: "Manage Plays"
      }} 
    />
    <Drawer.Screen 
      name="AssignActors" 
      component={AssignActorsScreen} 
      options={{ 
        title: "Assign Actors",
        drawerLabel: "Assign Actors"
      }} 
    />
  </Drawer.Navigator>
);

/* =======================
   SUPPLIER DRAWER NAVIGATOR
======================= */
const SupplierDrawerNavigator = () => (
  <Drawer.Navigator
    initialRouteName="SupplierHome"
    drawerContent={(props) => <SupplierDrawerContent {...props} />}
    screenOptions={{
      headerStyle: { backgroundColor: "#6200EE" },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "bold" }
    }}
  >
    <Drawer.Screen 
      name="SupplierHome" 
      component={SupplierHomeScreen} 
      options={{ 
        title: "Supplier Dashboard",
        drawerLabel: "Dashboard"
      }} 
    />
  </Drawer.Navigator>
);

/* =======================
   MAIN APP NAVIGATOR
======================= */
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: "#6200EE" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" }
        }}
      >
        {/* AUTH */}
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Register" }} />

        {/* AUDIENCE */}
        <Stack.Screen name="Home" component={DrawerNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="PlayDetails" component={PlayDetailsScreen} options={{ title: "Play Details" }} />

        {/* PLAY MANAGER */}
        <Stack.Screen 
          name="PlayManagerHome" 
          component={PlayManagerDrawerNavigator} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen name="CreatePlay" component={CreatePlayScreen} options={{ title: "Create New Play" }} />
        <Stack.Screen name="ManagePlays" component={ManagePlaysScreen} options={{ title: "Manage Plays" }} />
        <Stack.Screen name="AssignActors" component={AssignActorsScreen} options={{ title: "Assign Actors" }} />
        <Stack.Screen name="ManagerBookings" component={ManagerBookingsScreen} options={{ title: "Manage Bookings" }} />

        {/* ACTOR */}
        <Stack.Screen name="ActorHome" component={ActorHomeScreen} options={{ title: "Actor Dashboard" }} />

        {/* INVENTORY */}
        <Stack.Screen name="InventoryHome" component={InventoryHomeScreen} options={{ title: "Inventory Dashboard" }} />
        <Stack.Screen name="InventoryOrders" component={InventoryOrdersScreen} options={{ title: "Inventory Orders" }} />

        {/* FINANCE */}
        <Stack.Screen name="FinanceHome" component={FinanceHomeScreen} options={{ title: "Finance Dashboard" }} />
        <Stack.Screen name="Tickets" component={TicketsScreen} options={{ title: "All Tickets" }} />
        <Stack.Screen name="Order" component={OrderScreen} options={{ title: "Inventory Orders" }} />

        {/* SUPPLIER */}
        <Stack.Screen 
          name="SupplierHome" 
          component={SupplierDrawerNavigator} 
          options={{ headerShown: false }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;