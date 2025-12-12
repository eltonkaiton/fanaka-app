import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  Platform, 
  TouchableOpacity, 
  Image 
} from "react-native";
import axios from "axios";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";

export default function CreatePlayScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [imageUri, setImageUri] = useState("");
  const [venue, setVenue] = useState("");
  const [loading, setLoading] = useState(false);

  // Request permissions on component mount
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
        }
      }
    })();
  }, []);

  // Pick image from gallery - SIMPLE WORKING VERSION
  const pickImage = async () => {
    try {
      console.log("Starting image picker...");
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images', // Use lowercase 'images' string
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      console.log("Image picker result:", result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        console.log("Image selected:", result.assets[0].uri);
      } else {
        console.log("User cancelled image picker");
      }
    } catch (error) {
      console.error("Pick Image Error:", error);
      Alert.alert("Error", "Failed to pick image. Please check app permissions.");
    }
  };

  const handleCreatePlay = async () => {
    if (!title || !description || !date || !venue) {
      Alert.alert("Validation Error", "Please fill all required fields.");
      return;
    }

    try {
      setLoading(true);
      const API_URL = "http://192.168.100.13:5000/api/plays";

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("date", date.toISOString().split("T")[0]);
      formData.append("venue", venue);

      if (imageUri) {
        // Extract filename from URI
        let filename = imageUri.split("/").pop();
        
        // Ensure filename has extension
        if (!filename.match(/\.(jpg|jpeg|png|gif)$/i)) {
          filename = `${Date.now()}.jpg`;
        }
        
        // Get file type
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
        
        // Get file name without special characters
        const cleanFilename = filename.replace(/[^a-zA-Z0-9.]/g, '_');
        
        console.log("Appending image:", cleanFilename, type);
        
        formData.append("image", {
          uri: imageUri,
          name: cleanFilename,
          type: type,
        });
      }

      console.log("Sending request to:", API_URL);
      
      const response = await axios.post(API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 10000, // 10 second timeout
      });

      console.log("Response status:", response.status);
      console.log("Response data:", response.data);

      if (response.status === 201 || response.status === 200) {
        Alert.alert("Success", "Play created successfully!");
        
        // Clear form
        setTitle("");
        setDescription("");
        setDate(new Date());
        setVenue("");
        setImageUri("");
        
        // Navigate back and refresh the plays list
        navigation.navigate('ManagePlays');
      } else {
        Alert.alert("Error", "Failed to create play. Please try again.");
      }
    } catch (error) {
      console.error("Create Play Error:", error);
      
      if (error.response) {
        // Server responded with error
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        Alert.alert("Error", `Server error: ${error.response.data?.error || error.message}`);
      } else if (error.request) {
        // No response received
        console.error("No response received:", error.request);
        Alert.alert("Error", "No response from server. Check your connection.");
      } else {
        // Other errors
        console.error("Error message:", error.message);
        Alert.alert("Error", `Request failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) setDate(selectedDate);
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Create New Play</Text>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Play Title *</Text>
        <TextInput 
          style={styles.input} 
          value={title} 
          onChangeText={setTitle} 
          placeholder="Enter play title" 
          placeholderTextColor="#999"
          editable={!loading}
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          placeholder="Enter description"
          placeholderTextColor="#999"
          textAlignVertical="top"
          editable={!loading}
        />

        <Text style={styles.label}>Date *</Text>
        <TouchableOpacity 
          onPress={() => !loading && setShowDatePicker(true)} 
          style={styles.dateTouchable}
          disabled={loading}
        >
          <View style={[styles.dateInput, loading && styles.disabledInput]}>
            <Text style={[styles.dateText, loading && styles.disabledText]}>
              {date.toISOString().split("T")[0]}
            </Text>
          </View>
        </TouchableOpacity>
        
        {showDatePicker && (
          <DateTimePicker 
            value={date} 
            mode="date" 
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeDate}
            minimumDate={new Date()}
          />
        )}

        <Text style={styles.label}>Venue *</Text>
        <TextInput 
          style={[styles.input, loading && styles.disabledInput]}
          value={venue} 
          onChangeText={setVenue} 
          placeholder="Enter venue location" 
          placeholderTextColor="#999"
          editable={!loading}
        />
      </View>

      <View style={styles.imageSection}>
        <Text style={styles.label}>Play Image (optional)</Text>
        
        <TouchableOpacity 
          onPress={!loading ? pickImage : null} 
          style={[styles.pickImageButton, loading && styles.disabledButton]}
          activeOpacity={0.8}
          disabled={loading}
        >
          <Text style={styles.pickImageText}>📁 Pick Image from Gallery</Text>
        </TouchableOpacity>

        {imageUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image 
              source={{ uri: imageUri }} 
              style={styles.previewImage} 
              resizeMode="cover"
            />
            {!loading && (
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => setImageUri("")}
              >
                <Text style={styles.removeButtonText}>Remove Image</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>No image selected</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity 
          style={[styles.createButton, loading && styles.disabledButton]}
          onPress={!loading ? handleCreatePlay : null}
          activeOpacity={0.9}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.createButtonText}>Creating...</Text>
          ) : (
            <Text style={styles.createButtonText}>Create Play</Text>
          )}
        </TouchableOpacity>
        
        {!loading && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  formSection: {
    marginBottom: 20,
  },
  imageSection: {
    marginBottom: 20,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: "#333",
    marginBottom: 15,
  },
  disabledInput: {
    backgroundColor: "#f5f5f5",
    borderColor: "#eee",
  },
  disabledText: {
    color: "#999",
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  dateTouchable: {
    marginBottom: 15,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  pickImageButton: {
    backgroundColor: "#6200ee",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: "#999",
    opacity: 0.7,
  },
  pickImageText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  imagePreviewContainer: {
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  removeButton: {
    backgroundColor: "#ff4444",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  removeButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  noImageContainer: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
  },
  noImageText: {
    color: "#888",
    fontSize: 14,
  },
  buttonSection: {
    marginTop: 10,
  },
  createButton: {
    backgroundColor: "#28a745",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dc3545",
  },
  cancelButtonText: {
    color: "#dc3545",
    fontWeight: "600",
    fontSize: 16,
  },
});