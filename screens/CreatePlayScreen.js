// screens/CreatePlayScreen.js
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
  Image,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard
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
  
  // Ticket Pricing States
  const [regularPrice, setRegularPrice] = useState("");
  const [vipPrice, setVipPrice] = useState("");
  const [vvipPrice, setVvipPrice] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Pick Image Error:", error);
      Alert.alert("Error", "Failed to pick image. Please check app permissions.");
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!title.trim()) newErrors.title = "Title is required";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!venue.trim()) newErrors.venue = "Venue is required";
    if (!regularPrice.trim()) newErrors.regularPrice = "Regular price is required";
    if (!vipPrice.trim()) newErrors.vipPrice = "VIP price is required";
    if (!vvipPrice.trim()) newErrors.vvipPrice = "VVIP price is required";
    
    // Validate numeric prices
    const regPrice = parseFloat(regularPrice);
    const vipP = parseFloat(vipPrice);
    const vvipP = parseFloat(vvipPrice);
    
    if (isNaN(regPrice) || regPrice < 0) newErrors.regularPrice = "Enter valid price (numbers only)";
    if (isNaN(vipP) || vipP < 0) newErrors.vipPrice = "Enter valid price (numbers only)";
    if (isNaN(vvipP) || vvipP < 0) newErrors.vvipPrice = "Enter valid price (numbers only)";
    
    // Validate price hierarchy (optional: VVIP > VIP > Regular)
    if (regPrice >= vipP) newErrors.priceHierarchy = "VIP price should be higher than Regular";
    if (vipP >= vvipP) newErrors.priceHierarchy = "VVIP price should be higher than VIP";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreatePlay = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fix all errors before submitting.");
      return;
    }

    try {
      setLoading(true);
      const API_URL = "http://192.168.100.164:5000/api/plays";

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("date", date.toISOString().split("T")[0]);
      formData.append("venue", venue.trim());
      formData.append("regularPrice", parseFloat(regularPrice));
      formData.append("vipPrice", parseFloat(vipPrice));
      formData.append("vvipPrice", parseFloat(vvipPrice));

      if (imageUri) {
        let filename = imageUri.split("/").pop();
        
        if (!filename.match(/\.(jpg|jpeg|png|gif)$/i)) {
          filename = `${Date.now()}.jpg`;
        }
        
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
        const cleanFilename = filename.replace(/[^a-zA-Z0-9.]/g, '_');
        
        formData.append("image", {
          uri: imageUri,
          name: cleanFilename,
          type: type,
        });
      }

      const response = await axios.post(API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 15000,
      });

      if (response.status === 201 || response.status === 200) {
        Alert.alert(
          "Success", 
          "Play created successfully!",
          [
            {
              text: "OK",
              onPress: () => {
                // Clear form
                setTitle("");
                setDescription("");
                setDate(new Date());
                setVenue("");
                setRegularPrice("");
                setVipPrice("");
                setVvipPrice("");
                setImageUri("");
                setErrors({});
                
                // Navigate back
                navigation.goBack();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error("Create Play Error:", error);
      
      let errorMessage = "Failed to create play. Please try again.";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timeout. Check your connection.";
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) setDate(selectedDate);
  };

  const formatCurrency = (value) => {
    if (!value) return "";
    const num = parseFloat(value);
    return isNaN(num) ? value : num.toLocaleString('en-KE');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create New Play</Text>
            <Text style={styles.subtitle}>Fill in play details and pricing</Text>
          </View>

          {/* Basic Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Play Title *</Text>
              <TextInput 
                style={[styles.input, errors.title && styles.inputError]} 
                value={title} 
                onChangeText={(text) => {
                  setTitle(text);
                  if (errors.title) setErrors({...errors, title: null});
                }}
                placeholder="Enter play title" 
                placeholderTextColor="#999"
                editable={!loading}
              />
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                value={description}
                onChangeText={(text) => {
                  setDescription(text);
                  if (errors.description) setErrors({...errors, description: null});
                }}
                multiline
                numberOfLines={4}
                placeholder="Enter description..."
                placeholderTextColor="#999"
                textAlignVertical="top"
                editable={!loading}
              />
              {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity 
                onPress={() => !loading && setShowDatePicker(true)} 
                style={styles.dateTouchable}
                disabled={loading}
              >
                <View style={[styles.dateInput, loading && styles.disabledInput]}>
                  <Text style={[styles.dateText, loading && styles.disabledText]}>
                    {date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
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
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Venue *</Text>
              <TextInput 
                style={[styles.input, errors.venue && styles.inputError]}
                value={venue} 
                onChangeText={(text) => {
                  setVenue(text);
                  if (errors.venue) setErrors({...errors, venue: null});
                }}
                placeholder="Enter venue location" 
                placeholderTextColor="#999"
                editable={!loading}
              />
              {errors.venue && <Text style={styles.errorText}>{errors.venue}</Text>}
            </View>
          </View>

          {/* Ticket Pricing Section - SIMPLIFIED */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ticket Pricing (KES)</Text>
            <Text style={styles.sectionSubtitle}>Set prices for different ticket categories</Text>
            
            {errors.priceHierarchy && (
              <View style={styles.priceWarning}>
                <Text style={styles.warningText}>⚠️ {errors.priceHierarchy}</Text>
              </View>
            )}
            
            <View style={styles.pricingContainer}>
              {/* Regular Price */}
              <View style={styles.priceInputGroup}>
                <View style={styles.priceLabelRow}>
                  <View style={[styles.priceTypeBadge, styles.regularBadge]}>
                    <Text style={styles.priceTypeText}>Regular</Text>
                  </View>
                  <Text style={styles.priceTypeSubtext}>Basic seating</Text>
                </View>
                <View style={[styles.priceInputWrapper, errors.regularPrice && styles.inputError]}>
                  <Text style={styles.currencyLabel}>KES</Text>
                  <TextInput
                    style={styles.priceInputField}
                    value={regularPrice}
                    onChangeText={(text) => {
                      const filtered = text.replace(/[^0-9]/g, '');
                      setRegularPrice(filtered);
                      if (errors.regularPrice) setErrors({...errors, regularPrice: null});
                    }}
                    placeholder="Enter amount"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    editable={!loading}
                  />
                </View>
                {regularPrice && (
                  <Text style={styles.formattedPriceText}>
                    {formatCurrency(regularPrice)}
                  </Text>
                )}
                {errors.regularPrice && <Text style={styles.errorText}>{errors.regularPrice}</Text>}
              </View>

              {/* VIP Price */}
              <View style={styles.priceInputGroup}>
                <View style={styles.priceLabelRow}>
                  <View style={[styles.priceTypeBadge, styles.vipBadge]}>
                    <Text style={styles.priceTypeText}>VIP</Text>
                  </View>
                  <Text style={styles.priceTypeSubtext}>Premium seating</Text>
                </View>
                <View style={[styles.priceInputWrapper, errors.vipPrice && styles.inputError]}>
                  <Text style={styles.currencyLabel}>KES</Text>
                  <TextInput
                    style={styles.priceInputField}
                    value={vipPrice}
                    onChangeText={(text) => {
                      const filtered = text.replace(/[^0-9]/g, '');
                      setVipPrice(filtered);
                      if (errors.vipPrice) setErrors({...errors, vipPrice: null});
                    }}
                    placeholder="Enter amount"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    editable={!loading}
                  />
                </View>
                {vipPrice && (
                  <Text style={styles.formattedPriceText}>
                    {formatCurrency(vipPrice)}
                  </Text>
                )}
                {errors.vipPrice && <Text style={styles.errorText}>{errors.vipPrice}</Text>}
              </View>

              {/* VVIP Price */}
              <View style={styles.priceInputGroup}>
                <View style={styles.priceLabelRow}>
                  <View style={[styles.priceTypeBadge, styles.vvipBadge]}>
                    <Text style={styles.priceTypeText}>VVIP</Text>
                  </View>
                  <Text style={styles.priceTypeSubtext}>Luxury seating</Text>
                </View>
                <View style={[styles.priceInputWrapper, errors.vvipPrice && styles.inputError]}>
                  <Text style={styles.currencyLabel}>KES</Text>
                  <TextInput
                    style={styles.priceInputField}
                    value={vvipPrice}
                    onChangeText={(text) => {
                      const filtered = text.replace(/[^0-9]/g, '');
                      setVvipPrice(filtered);
                      if (errors.vvipPrice) setErrors({...errors, vvipPrice: null});
                    }}
                    placeholder="Enter amount"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    editable={!loading}
                  />
                </View>
                {vvipPrice && (
                  <Text style={styles.formattedPriceText}>
                    {formatCurrency(vvipPrice)}
                  </Text>
                )}
                {errors.vvipPrice && <Text style={styles.errorText}>{errors.vvipPrice}</Text>}
              </View>
            </View>
          </View>

          {/* Image Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Play Image</Text>
            <Text style={styles.sectionSubtitle}>Add an image for the play (Optional)</Text>
            
            <TouchableOpacity 
              onPress={!loading ? pickImage : null} 
              style={[styles.pickImageButton, loading && styles.disabledButton]}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.pickImageText}>📁 Choose Image</Text>
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

          {/* Action Buttons */}
          <View style={styles.buttonSection}>
            <TouchableOpacity 
              style={[styles.createButton, loading && styles.disabledButton]}
              onPress={!loading ? handleCreatePlay : null}
              activeOpacity={0.9}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.createButtonText}>Creating Play...</Text>
              ) : (
                <>
                  <Text style={styles.createButtonText}>Create Play</Text>
                  <Text style={styles.createButtonSubtext}>Save and publish</Text>
                </>
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
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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
    marginBottom: 25,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
    textAlign: "center",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: "#333",
  },
  inputError: {
    borderColor: "#ff4444",
    backgroundColor: "#fff8f8",
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  errorText: {
    color: "#ff4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  dateTouchable: {
    marginBottom: 0,
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
  disabledInput: {
    backgroundColor: "#f5f5f5",
    borderColor: "#eee",
  },
  disabledText: {
    color: "#999",
  },
  
  // Simplified Pricing Styles
  pricingContainer: {
    marginTop: 10,
  },
  priceInputGroup: {
    marginBottom: 18,
  },
  priceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  priceTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  regularBadge: {
    backgroundColor: "#e6f2ff",
  },
  vipBadge: {
    backgroundColor: "#fff0e6",
  },
  vvipBadge: {
    backgroundColor: "#f0e6ff",
  },
  priceTypeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  regularBadgeText: {
    color: "#0066cc",
  },
  vipBadgeText: {
    color: "#ff6600",
  },
  vvipBadgeText: {
    color: "#9900cc",
  },
  priceTypeSubtext: {
    fontSize: 13,
    color: "#666",
  },
  priceInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginRight: 8,
  },
  priceInputField: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
  formattedPriceText: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
    marginLeft: 4,
  },
  priceWarning: {
    backgroundColor: "#fff8e6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ffcc80",
  },
  warningText: {
    color: "#ff9800",
    fontSize: 12,
  },
  
  // Image Styles
  pickImageButton: {
    backgroundColor: "#6200ee",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: "#999",
    opacity: 0.7,
  },
  pickImageText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  imagePreviewContainer: {
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
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
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    marginBottom: 5,
  },
  noImageText: {
    color: "#888",
    fontSize: 14,
  },
  
  // Button Section
  buttonSection: {
    marginTop: 10,
  },
  createButton: {
    backgroundColor: "#28a745",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  createButtonSubtext: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    marginTop: 2,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dc3545",
    backgroundColor: "#fff",
  },
  cancelButtonText: {
    color: "#dc3545",
    fontWeight: "600",
    fontSize: 16,
  },
});