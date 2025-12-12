// screens/AboutUsScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AboutUsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>About Fanaka Arts</Text>
      
      <Text style={styles.text}>
        Fanaka Arts is a platform dedicated to showcasing the best theatrical plays and performances.
      </Text>
      <Text style={styles.text}>
        We provide audiences with an easy way to explore, book, and enjoy cultural events.
      </Text>
      <Text style={styles.text}>
        Our mission is to connect audiences with artists and enhance the cultural experience in our community.
      </Text>
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
    lineHeight: 22, 
    color: '#333', 
    marginBottom: 10 
  },
});

export default AboutUsScreen;
