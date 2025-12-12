// screens/ContactUsScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ContactUsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contact Us</Text>

      <Text style={styles.label}>Fanaka Arts</Text>
      <Text style={styles.info}>Email: info@fanakaarts.com</Text>
      <Text style={styles.info}>Phone: +254 798 562 533</Text>
      <Text style={styles.info}>Address: Nairobi, Kenya</Text>

      <Text style={[styles.label, { marginTop: 20 }]}>Working Hours</Text>
      <Text style={styles.info}>Monday - Friday: 9:00 AM - 6:00 PM</Text>
      <Text style={styles.info}>Saturday: 10:00 AM - 4:00 PM</Text>
      <Text style={styles.info}>Sunday: Closed</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f8f8',
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#6200EE',
    textAlign: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  info: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
});

export default ContactUsScreen;
