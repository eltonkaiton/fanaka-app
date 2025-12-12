// navigation/AppNavigator.js
import React from 'react';
import { Alert } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import PlayDetailsScreen from '../screens/PlayDetailsScreen';
import ContactUsScreen from '../screens/ContactUsScreen';
import AboutUsScreen from '../screens/AboutUsScreen';
import HelpScreen from '../screens/HelpScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';

// Play Manager Screens
import PlayManagerHomeScreen from '../screens/PlayManagerHomeScreen';
import CreatePlayScreen from '../screens/CreatePlayScreen';
import ManagePlaysScreen from '../screens/ManagePlaysScreen';
import AssignActorsScreen from '../screens/AssignActorsScreen';

// ⭐ Actor Screen
import ActorHomeScreen from '../screens/ActorHomeScreen';

// ⭐ NEW — Inventory Screen
import InventoryHomeScreen from '../screens/InventoryHomeScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// ==============================
// Custom Drawer With Logout
// ==============================
const CustomDrawerContent = ({ navigation }) => {
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      Alert.alert('Logged Out', 'You have been logged out successfully');
      navigation.replace('Login');
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  return (
    <DrawerContentScrollView>
      <DrawerItem label="Home" onPress={() => navigation.navigate('HomeDrawer')} />
      <DrawerItem label="My Bookings" onPress={() => navigation.navigate('MyBookings')} />
      <DrawerItem label="Contact Us" onPress={() => navigation.navigate('ContactUs')} />
      <DrawerItem label="About Us" onPress={() => navigation.navigate('AboutUs')} />
      <DrawerItem label="Help" onPress={() => navigation.navigate('Help')} />
      <DrawerItem label="Logout" onPress={handleLogout} />
    </DrawerContentScrollView>
  );
};

// ==============================
// Drawer Navigator (Audience)
// ==============================
const DrawerNavigator = () => (
  <Drawer.Navigator
    initialRouteName="HomeDrawer"
    drawerContent={(props) => <CustomDrawerContent {...props} />}
    screenOptions={{
      headerStyle: { backgroundColor: '#6200EE' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <Drawer.Screen name="HomeDrawer" component={HomeScreen} options={{ title: 'Home' }} />
    <Drawer.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: 'My Bookings' }} />
    <Drawer.Screen name="ContactUs" component={ContactUsScreen} options={{ title: 'Contact Us' }} />
    <Drawer.Screen name="AboutUs" component={AboutUsScreen} options={{ title: 'About Us' }} />
    <Drawer.Screen name="Help" component={HelpScreen} options={{ title: 'Help & Support' }} />
  </Drawer.Navigator>
);

// ==============================
// Main App Navigator
// ==============================
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: '#6200EE' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {/* Authentication */}
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />

        {/* Audience Drawer Navigation */}
        <Stack.Screen name="Home" component={DrawerNavigator} options={{ headerShown: false }} />

        {/* Play Manager Screens */}
        <Stack.Screen
          name="PlayManagerHome"
          component={PlayManagerHomeScreen}
          options={{ title: 'Play Manager Dashboard' }}
        />
        <Stack.Screen name="CreatePlay" component={CreatePlayScreen} options={{ title: 'Create New Play' }} />
        <Stack.Screen name="ManagePlays" component={ManagePlaysScreen} options={{ title: 'Manage Existing Plays' }} />
        <Stack.Screen name="AssignActors" component={AssignActorsScreen} options={{ title: 'Assign Actors to Play' }} />

        {/* Actor Dashboard */}
        <Stack.Screen name="ActorHome" component={ActorHomeScreen} options={{ title: 'Actor Dashboard' }} />

        {/* ⭐ NEW — Inventory Dashboard */}
        <Stack.Screen
          name="InventoryHome"
          component={InventoryHomeScreen}
          options={{ title: 'Inventory Dashboard' }}
        />

        {/* Other Screens */}
        <Stack.Screen name="PlayDetails" component={PlayDetailsScreen} options={{ title: 'Play Details' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
