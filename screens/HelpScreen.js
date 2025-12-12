// screens/HelpScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HelpScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Help & Support</Text>
      <Text style={styles.text}>
        Need assistance? Here are some helpful tips:
      </Text>
      <Text style={styles.item}>• Register or login to access the latest plays.</Text>
      <Text style={styles.item}>• Browse upcoming plays on the home screen.</Text>
      <Text style={styles.item}>• Click on a play to see details and book tickets.</Text>
      <Text style={styles.item}>• For further inquiries, use the Contact Us section.</Text>
      <Text style={styles.item}>• Ensure your account is active before booking.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#f8f8f8', 
    justifyContent: 'flex-start' 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 15, 
    textAlign: 'center', 
    color: '#6200EE' 
  },
  text: { 
    fontSize: 16, 
    marginBottom: 10, 
    color: '#333' 
  },
  item: { 
    fontSize: 16, 
    marginBottom: 8, 
    color: '#555' 
  },
});

export default HelpScreen;
