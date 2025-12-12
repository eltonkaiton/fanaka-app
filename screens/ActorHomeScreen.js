import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";

const { width } = Dimensions.get("window");

export default function ActorHomeScreen({ navigation, route }) {
  const { actorId } = route.params; // passed in during login
  const [actor, setActor] = useState(null);
  const [assignedPlays, setAssignedPlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlay, setSelectedPlay] = useState(null);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming"); // upcoming or past

  const API_BASE_URL = "http://192.168.100.13:5000";

  const materialOptions = [
    "Costume",
    "Shoes",
    "Hat/Wig",
    "Props",
    "Stage Makeup",
    "Script Copy",
    "Cue Cards",
    "Microphone/Earpiece",
    "Special Effects Items",
    "Water/Snacks",
    "Other",
  ];

  const fetchActorDashboard = async () => {
    if (!actorId) return;
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/actors/${actorId}/dashboard`
      );
      setActor(response.data.actor);
      setAssignedPlays(
        response.data.plays.map((p) => ({
          ...p,
          confirmed: p.actors.find(a => a.actor === actorId)?.confirmed || false,
        }))
      );
    } catch (error) {
      console.log("Actor Home Fetch Error:", error?.response?.data || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!actorId) {
      Alert.alert("Error", "Actor ID missing. Please log in again.");
      navigation.replace("Login");
      return;
    }
    fetchActorDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActorDashboard();
  };

  const handleConfirmPlay = async (playId) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/actors/${playId}/confirm`, {
        actorId: actor._id,
      });

      setAssignedPlays((prev) =>
        prev.map((p) => (p._id === playId ? { ...p, confirmed: true } : p))
      );

      Alert.alert("Success", "You have confirmed your availability for this play.");
    } catch (error) {
      console.log("Confirm Play Error:", error?.response?.data || error);
      Alert.alert("Error", "Could not confirm play. Try again.");
    }
  };

  const openModal = (play) => {
    setSelectedPlay(play);
    setSelectedMaterials([]);
    setModalVisible(true);
  };

  const toggleMaterialSelection = (material) => {
    if (selectedMaterials.includes(material)) {
      setSelectedMaterials((prev) => prev.filter((m) => m !== material));
    } else {
      setSelectedMaterials((prev) => [...prev, material]);
    }
  };

  const handleRequestMaterials = async () => {
    if (selectedMaterials.length === 0) {
      Alert.alert("Error", "Please select at least one material.");
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/actors/${selectedPlay._id}/request-materials`,
        {
          actorId: actor._id,
          materials: selectedMaterials,
        }
      );
      Alert.alert("Request Sent", "Your material request has been sent.");
      fetchActorDashboard(); // Refresh to include new request
      setModalVisible(false);
    } catch (error) {
      console.log("Request Materials Error:", error?.response?.data || error);
      Alert.alert("Error", "Could not send request. Try again.");
    }
  };

  const getPlayStatus = (playDate) => {
    const now = new Date();
    const playDateTime = new Date(playDate);
    const diffTime = playDateTime - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: "Past Event", color: "#dc3545" };
    if (diffDays === 0) return { text: "Today", color: "#ff9800" };
    if (diffDays <= 7) return { text: "This Week", color: "#4caf50" };
    return { text: "Upcoming", color: "#2196f3" };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFullImageUrl = (imagePath) => {
    if (!imagePath) return null;
    return imagePath.startsWith("http") ? imagePath : `${API_BASE_URL}${imagePath}`;
  };

  // Filter plays based on active tab
  const filteredPlays = assignedPlays.filter((play) => {
    const matchesSearch = play.title.toLowerCase().includes(searchQuery.toLowerCase());
    const isUpcoming = new Date(play.date) > new Date();
    
    if (activeTab === "upcoming") {
      return matchesSearch && isUpcoming;
    } else {
      return matchesSearch && !isUpcoming;
    }
  });

  const renderPlay = ({ item }) => {
    const status = getPlayStatus(item.date);
    const imageUrl = getFullImageUrl(item.image);
    
    return (
      <TouchableOpacity style={styles.playCard} onPress={() => openModal(item)}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.playImage} />
        ) : (
          <View style={styles.playPlaceholder}>
            <Ionicons name="theater" size={40} color="#777" />
          </View>
        )}
        
        <View style={styles.playInfo}>
          <View style={styles.playHeader}>
            <Text style={styles.playTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Text style={styles.statusText}>{status.text}</Text>
            </View>
          </View>
          
          <View style={styles.playDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.detailText}>{formatDate(item.date)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.detailText} numberOfLines={1}>{item.venue}</Text>
            </View>
            <View style={styles.detailItem}>
              <MaterialIcons name="person-outline" size={14} color="#666" />
              <Text style={styles.detailText}>Role: {item.role || "Not specified"}</Text>
            </View>
          </View>
          
          <View style={styles.playFooter}>
            {!item.confirmed ? (
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleConfirmPlay(item._id);
                }}
              >
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.confirmButtonText}>Confirm Availability</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.confirmedTag}>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.confirmedText}>Confirmed</Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.detailsButton}
              onPress={(e) => {
                e.stopPropagation();
                openModal(item);
              }}
            >
              <Ionicons name="information-circle-outline" size={16} color="#6200EE" />
              <Text style={styles.detailsButtonText}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPlayDetailsModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.closeButtonTop}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Play Image */}
            {selectedPlay?.image && (
              <Image 
                source={{ uri: getFullImageUrl(selectedPlay.image) }} 
                style={styles.modalImage}
                resizeMode="cover"
              />
            )}
            
            {/* Play Title and Status */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedPlay?.title}</Text>
              <View style={[styles.modalStatusBadge, 
                { backgroundColor: getPlayStatus(selectedPlay?.date).color }]}>
                <Text style={styles.modalStatusText}>
                  {getPlayStatus(selectedPlay?.date).text}
                </Text>
              </View>
            </View>
            
            {/* Play Details */}
            <View style={styles.modalDetailsGrid}>
              <View style={styles.modalDetailItem}>
                <Ionicons name="calendar-outline" size={20} color="#6200EE" />
                <Text style={styles.modalDetailLabel}>Date & Time</Text>
                <Text style={styles.modalDetailValue}>
                  {selectedPlay?.date ? formatDate(selectedPlay.date) : "N/A"}
                </Text>
              </View>
              
              <View style={styles.modalDetailItem}>
                <Ionicons name="location-outline" size={20} color="#6200EE" />
                <Text style={styles.modalDetailLabel}>Venue</Text>
                <Text style={styles.modalDetailValue}>
                  {selectedPlay?.venue || "Not specified"}
                </Text>
              </View>
              
              <View style={styles.modalDetailItem}>
                <MaterialIcons name="person-outline" size={20} color="#6200EE" />
                <Text style={styles.modalDetailLabel}>Your Role</Text>
                <Text style={styles.modalDetailValue}>
                  {selectedPlay?.role || "Not specified"}
                </Text>
              </View>
              
              <View style={styles.modalDetailItem}>
                <Ionicons name="cash-outline" size={20} color="#6200EE" />
                <Text style={styles.modalDetailLabel}>Price</Text>
                <Text style={[styles.modalDetailValue, styles.priceText]}>
                  KES {selectedPlay?.price || "0"}
                </Text>
              </View>
            </View>
            
            {/* Description */}
            {selectedPlay?.description && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Description</Text>
                <Text style={styles.modalDescription}>
                  {selectedPlay.description}
                </Text>
              </View>
            )}
            
            {/* Existing Material Requests */}
            {selectedPlay?.materialRequests?.filter(req => req.actor === actor?._id).length > 0 && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Your Material Requests</Text>
                {selectedPlay.materialRequests
                  .filter(req => req.actor === actor?._id)
                  .map((req, idx) => (
                    <View key={idx} style={styles.requestItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
                      <Text style={styles.requestText}>
                        {req.materials.join(", ")}
                      </Text>
                    </View>
                  ))}
              </View>
            )}
            
            {/* Request New Materials */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Request Materials</Text>
              <Text style={styles.sectionSubtitle}>
                Select items you need for this play:
              </Text>
              
              <View style={styles.materialsGrid}>
                {materialOptions.map((material, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.materialChip,
                      selectedMaterials.includes(material) && styles.materialChipSelected,
                    ]}
                    onPress={() => toggleMaterialSelection(material)}
                  >
                    <Text style={[
                      styles.materialChipText,
                      selectedMaterials.includes(material) && styles.materialChipTextSelected,
                    ]}>
                      {material}
                    </Text>
                    {selectedMaterials.includes(material) && (
                      <Ionicons name="checkmark" size={14} color="#fff" style={{ marginLeft: 4 }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  selectedMaterials.length === 0 && styles.submitButtonDisabled
                ]} 
                onPress={handleRequestMaterials}
                disabled={selectedMaterials.length === 0}
              >
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={styles.submitButtonText}>
                  Send Request ({selectedMaterials.length} items)
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>Welcome back</Text>
                <Text style={styles.actorName}>{actor?.fullName}</Text>
              </View>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => navigation.navigate("Profile", { actorId })}
              >
                <Ionicons name="person-circle" size={40} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.profileInfo}>
              <View style={styles.stageNameBadge}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.stageName}>{actor?.stageName}</Text>
              </View>
              <Text style={styles.actorContact}>
                <Ionicons name="mail-outline" size={14} color="#fff" /> {actor?.email}
              </Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search plays by title..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {/* Tab Filter */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === "upcoming" && styles.tabButtonActive]}
              onPress={() => setActiveTab("upcoming")}
            >
              <Text style={[styles.tabText, activeTab === "upcoming" && styles.tabTextActive]}>
                Upcoming Plays
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === "past" && styles.tabButtonActive]}
              onPress={() => setActiveTab("past")}
            >
              <Text style={[styles.tabText, activeTab === "past" && styles.tabTextActive]}>
                Past Plays
              </Text>
            </TouchableOpacity>
          </View>

          {/* Plays List */}
          <FlatList
            data={filteredPlays}
            keyExtractor={(item) => item._id}
            renderItem={renderPlay}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#6200EE"]}
                tintColor="#6200EE"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={80} color="#e0e0e0" />
                <Text style={styles.emptyTitle}>
                  No {activeTab} plays found
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery ? "Try a different search term" : "You have no assigned plays"}
                </Text>
              </View>
            }
            contentContainerStyle={styles.listContainer}
          />

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => navigation.replace("Login")}
          >
            <Ionicons name="log-out-outline" size={22} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          {/* Play Details Modal */}
          {renderPlayDetailsModal()}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// ------------------ STYLES ------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "#f5f5f5"
  },
  loadingText: { 
    marginTop: 15, 
    color: "#666", 
    fontSize: 16 
  },
  
  // Header Styles
  header: { 
    paddingHorizontal: 20, 
    paddingTop: 50, 
    paddingBottom: 20,
    backgroundColor: "#6200EE",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  greeting: { 
    color: "#fff", 
    fontSize: 14, 
    opacity: 0.9 
  },
  actorName: { 
    color: "#fff", 
    fontSize: 24, 
    fontWeight: "700", 
    marginTop: 2 
  },
  profileButton: {
    padding: 5,
  },
  profileInfo: {
    marginTop: 5,
  },
  stageNameBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  stageName: { 
    color: "#fff", 
    fontSize: 14, 
    fontWeight: "600",
    marginLeft: 5 
  },
  actorContact: { 
    color: "#fff", 
    fontSize: 14, 
    opacity: 0.9 
  },
  
  // Search Bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  
  // Tab Filter
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: "#6200EE",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  tabTextActive: {
    color: "#fff",
  },
  
  // List Container
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  
  // Play Card
  playCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 15,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  playImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  playPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  playInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: "space-between",
  },
  playHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  playTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  playDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
    flex: 1,
  },
  playFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  confirmedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#28a745",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  confirmedText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  detailsButtonText: {
    color: "#6200EE",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
  
  // Logout Button
  logoutButton: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#6200EE",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: "90%",
    paddingTop: 20,
  },
  closeButtonTop: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    padding: 5,
  },
  modalImage: {
    width: "100%",
    height: 200,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  modalStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  modalStatusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  modalDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalDetailItem: {
    width: "50%",
    marginBottom: 15,
    paddingRight: 10,
  },
  modalDetailLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
    marginBottom: 2,
  },
  modalDetailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  priceText: {
    color: "#4CAF50",
    fontSize: 16,
  },
  modalSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: "#444",
    textAlign: "justify",
  },
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  requestText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 10,
    flex: 1,
  },
  materialsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  materialChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  materialChipSelected: {
    backgroundColor: "#6200EE",
  },
  materialChipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  materialChipTextSelected: {
    color: "#fff",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6200EE",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});