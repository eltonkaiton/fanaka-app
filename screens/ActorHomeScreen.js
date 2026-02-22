import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert, Modal, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";

const API_BASE_URL = "https://fanaka-server-1.onrender.com";

export default function ActorHomeScreen({ navigation, route }) {
  const { actorId } = route.params;
  const [actor, setActor] = useState(null);
  const [assignedPlays, setAssignedPlays] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlay, setSelectedPlay] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");

  const fetchActorDashboard = async () => {
    if (!actorId) return;
    try {
      const [dashboardRes, itemsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/actors/${actorId}/dashboard`),
        axios.get(`${API_BASE_URL}/api/items`)
      ]);
      
      setActor(dashboardRes.data.actor);
      setAssignedPlays(dashboardRes.data.plays.map(p => ({
        ...p,
        confirmed: p.actors.find(a => a.actor === actorId)?.confirmed || false,
      })));
      
      const availableItems = itemsRes.data.filter(item => item.quantity > 0);
      setItems(availableItems);
    } catch (error) {
      console.log("Fetch Error:", error?.response?.data || error);
      Alert.alert("Error", "Failed to load data. Please try again.");
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
      await axios.patch(`${API_BASE_URL}/api/actors/${playId}/confirm`, { actorId: actor._id });
      setAssignedPlays(prev => prev.map(p => p._id === playId ? { ...p, confirmed: true } : p));
      Alert.alert("Success", "Availability confirmed!");
    } catch (error) {
      Alert.alert("Error", "Could not confirm play.");
    }
  };

  const handleMarkCollected = async (requestId) => {
    console.log("=== Mark Collected Debug ===");
    console.log("Play ID:", selectedPlay?._id);
    console.log("Request ID:", requestId);
    console.log("Actor ID:", actor?._id);
    
    Alert.alert(
      "Confirm Collection",
      "Are you sure you have collected all the items?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Collected", 
          onPress: async () => {
            try {
              // CORRECTED: Use play route instead of material-requests route
              const response = await axios.patch(
                `${API_BASE_URL}/api/plays/${selectedPlay._id}/material-requests/${requestId}/collect`,
                {
                  actorId: actor._id
                }
              );
              
              console.log("Success Response:", response.data);
              
              Alert.alert("Success", "Items marked as collected!");
              
              // Update local state immediately
              if (selectedPlay) {
                setSelectedPlay(prev => ({
                  ...prev,
                  materialRequests: prev.materialRequests.map(req => 
                    req._id === requestId 
                      ? { 
                          ...req, 
                          status: 'collected', 
                          collectedAt: new Date().toISOString(),
                          ...response.data.request
                        }
                      : req
                  )
                }));
              }
              
              // Refresh data
              fetchActorDashboard();
              
            } catch (error) {
              console.error("Mark Collected Error Details:", {
                message: error.message,
                url: error.config?.url,
                status: error.response?.status,
                data: error.response?.data
              });
              
              let errorMessage = "Could not mark as collected.";
              
              if (error.response?.status === 404) {
                errorMessage = "Collect endpoint not found. You need to add it to playRoutes.js.";
              } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
              }
              
              Alert.alert("Error", errorMessage);
            }
          }
        }
      ]
    );
  };

  const openModal = (play) => {
    setSelectedPlay(play);
    setSelectedItems({});
    setModalVisible(true);
  };

  const toggleItemSelection = (item) => {
    setSelectedItems(prev => {
      if (prev[item._id]) {
        const newItems = { ...prev };
        delete newItems[item._id];
        return newItems;
      } else {
        return {
          ...prev,
          [item._id]: {
            item,
            quantity: 1,
            maxQuantity: item.quantity
          }
        };
      }
    });
  };

  const updateItemQuantity = (itemId, change) => {
    setSelectedItems(prev => {
      const current = prev[itemId];
      if (!current) return prev;
      
      const newQuantity = current.quantity + change;
      if (newQuantity < 1 || newQuantity > current.maxQuantity) return prev;
      
      return {
        ...prev,
        [itemId]: {
          ...current,
          quantity: newQuantity
        }
      };
    });
  };

  const handleRequestItems = async () => {
    const selectedCount = Object.keys(selectedItems).length;
    if (selectedCount === 0) {
      Alert.alert("Error", "Please select at least one item.");
      return;
    }

    try {
      const materialsWithQuantity = Object.values(selectedItems).map(({ item, quantity }) => ({
        name: item.name,
        quantity: quantity
      }));
      
      await axios.post(`${API_BASE_URL}/api/actors/${selectedPlay._id}/request-materials`, {
        actorId: actor._id,
        materials: materialsWithQuantity
      });
      Alert.alert("Success", "Item request sent!");
      fetchActorDashboard();
      setModalVisible(false);
    } catch (error) {
      console.error("Request Items Error:", error.response?.data || error);
      Alert.alert("Error", error.response?.data?.error || "Could not send request.");
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

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const getFullImageUrl = (imagePath) => !imagePath ? null : imagePath.startsWith("http") ? imagePath : `${API_BASE_URL}${imagePath}`;

  const filteredPlays = assignedPlays.filter(play => {
    const matchesSearch = play.title.toLowerCase().includes(searchQuery.toLowerCase());
    const isUpcoming = new Date(play.date) > new Date();
    return activeTab === "upcoming" ? matchesSearch && isUpcoming : matchesSearch && !isUpcoming;
  });

  const renderPlay = ({ item }) => {
    const status = getPlayStatus(item.date);
    const imageUrl = getFullImageUrl(item.image);
    
    return (
      <TouchableOpacity style={styles.playCard} onPress={() => openModal(item)}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.playImage} /> : (
          <View style={styles.playPlaceholder}><Ionicons name="theater" size={40} color="#777" /></View>
        )}
        
        <View style={styles.playInfo}>
          <View style={styles.playHeader}>
            <Text style={styles.playTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Text style={styles.statusText}>{status.text}</Text>
            </View>
          </View>
          
          <View style={styles.playDetails}>
            <View style={styles.detailItem}><Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.detailText}>{formatDate(item.date)}</Text>
            </View>
            <View style={styles.detailItem}><Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.detailText} numberOfLines={1}>{item.venue}</Text>
            </View>
            <View style={styles.detailItem}><MaterialIcons name="person-outline" size={14} color="#666" />
              <Text style={styles.detailText}>Role: {item.role || "Not specified"}</Text>
            </View>
          </View>
          
          <View style={styles.playFooter}>
            {!item.confirmed ? (
              <TouchableOpacity style={styles.confirmButton} onPress={(e) => { e.stopPropagation(); handleConfirmPlay(item._id); }}>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.confirmedTag}><Ionicons name="checkmark-circle" size={16} color="#fff" /><Text style={styles.confirmedText}>Confirmed</Text></View>
            )}
            <TouchableOpacity style={styles.detailsButton} onPress={(e) => { e.stopPropagation(); openModal(item); }}>
              <Ionicons name="information-circle-outline" size={16} color="#6200EE" />
              <Text style={styles.detailsButtonText}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPlayDetailsModal = () => {
    const actorRequests = selectedPlay?.materialRequests?.filter(req => req.actor === actor?._id) || [];
    const hasPreparedRequests = actorRequests.some(req => req.status === 'prepared');
    
    return (
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButtonTop} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedPlay?.image && <Image source={{ uri: getFullImageUrl(selectedPlay.image) }} style={styles.modalImage} resizeMode="cover" />}
              
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedPlay?.title}</Text>
                <View style={[styles.modalStatusBadge, { backgroundColor: getPlayStatus(selectedPlay?.date).color }]}>
                  <Text style={styles.modalStatusText}>{getPlayStatus(selectedPlay?.date).text}</Text>
                </View>
              </View>
              
              <View style={styles.modalDetailsGrid}>
                <View style={styles.modalDetailItem}><Ionicons name="calendar-outline" size={20} color="#6200EE" /><Text style={styles.modalDetailLabel}>Date & Time</Text>
                  <Text style={styles.modalDetailValue}>{selectedPlay?.date ? formatDate(selectedPlay.date) : "N/A"}</Text>
                </View>
                <View style={styles.modalDetailItem}><Ionicons name="location-outline" size={20} color="#6200EE" /><Text style={styles.modalDetailLabel}>Venue</Text>
                  <Text style={styles.modalDetailValue}>{selectedPlay?.venue || "Not specified"}</Text>
                </View>
                <View style={styles.modalDetailItem}><MaterialIcons name="person-outline" size={20} color="#6200EE" /><Text style={styles.modalDetailLabel}>Your Role</Text>
                  <Text style={styles.modalDetailValue}>{selectedPlay?.role || "Not specified"}</Text>
                </View>
                <View style={styles.modalDetailItem}><Ionicons name="cash-outline" size={20} color="#6200EE" /><Text style={styles.modalDetailLabel}>Regular</Text>
                  <Text style={styles.priceText}>KES {selectedPlay?.regularPrice || "0"}</Text>
                </View>
                <View style={styles.modalDetailItem}><Ionicons name="star-outline" size={20} color="#6200EE" /><Text style={styles.modalDetailLabel}>VIP</Text>
                  <Text style={styles.priceText}>KES {selectedPlay?.vipPrice || "0"}</Text>
                </View>
                <View style={styles.modalDetailItem}><Ionicons name="diamond-outline" size={20} color="#6200EE" /><Text style={styles.modalDetailLabel}>VVIP</Text>
                  <Text style={styles.priceText}>KES {selectedPlay?.vvipPrice || "0"}</Text>
                </View>
              </View>
              
              {selectedPlay?.description && (
                <View style={styles.modalSection}><Text style={styles.modalSectionTitle}>Description</Text>
                  <Text style={styles.modalDescription}>{selectedPlay.description}</Text>
                </View>
              )}
              
              <View style={styles.modalSection}><Text style={styles.modalSectionTitle}>Assigned Actors</Text>
                {selectedPlay?.actors?.length > 0 ? selectedPlay.actors.map((a, idx) => (
                  <View key={idx} style={styles.actorItem}>
                    <Ionicons name="person" size={16} color="#6200EE" />
                    <Text style={styles.actorText}>{a.actor?.fullName || "Actor"} - {a.role}</Text>
                    <View style={[styles.confirmBadge, a.confirmed ? styles.confirmedBadge : styles.pendingBadge]}>
                      <Text style={styles.confirmBadgeText}>{a.confirmed ? "Confirmed" : "Pending"}</Text>
                    </View>
                  </View>
                )) : <Text style={styles.noDataText}>No actors assigned</Text>}
              </View>
              
              {actorRequests.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Your Material Requests</Text>
                  {hasPreparedRequests && (
                    <View style={styles.collectionAlert}>
                      <Ionicons name="cube-outline" size={20} color="#fff" />
                      <Text style={styles.collectionAlertText}>Items are prepared! You can collect them.</Text>
                    </View>
                  )}
                  {actorRequests.map((req, idx) => (
                    <View key={idx} style={[styles.requestItem, req.status === 'prepared' && styles.preparedRequest]}>
                      <View style={styles.requestHeader}>
                        <Ionicons name="cube" size={16} color="#6200EE" />
                        <Text style={styles.requestDate}>
                          Requested: {new Date(req.requestedAt || req.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      
                      <View style={styles.requestMaterials}>
                        {Array.isArray(req.materials) && req.materials.map((material, matIdx) => (
                          <View key={matIdx} style={styles.materialItem}>
                            <Text style={styles.materialName}>
                              {typeof material === 'object' ? material.name : material}
                            </Text>
                            <Text style={styles.materialQuantity}>
                              ×{typeof material === 'object' ? material.quantity : 1}
                            </Text>
                          </View>
                        ))}
                      </View>
                      
                      <View style={styles.requestFooter}>
                        <View style={[styles.statusBadgeSmall, 
                          req.status === 'approved' && styles.statusApproved,
                          req.status === 'rejected' && styles.statusRejected,
                          req.status === 'pending' && styles.statusPending,
                          req.status === 'prepared' && styles.statusPrepared,
                          req.status === 'collected' && styles.statusCollected
                        ]}>
                          <Text style={styles.statusTextSmall}>{req.status?.toUpperCase() || 'PENDING'}</Text>
                        </View>
                        
                        {req.status === 'prepared' && (
                          <TouchableOpacity 
                            style={styles.collectButton}
                            onPress={() => handleMarkCollected(req._id)}
                          >
                            <Ionicons name="checkmark-circle" size={16} color="#fff" />
                            <Text style={styles.collectButtonText}>Mark as Collected</Text>
                          </TouchableOpacity>
                        )}
                        
                        {req.status === 'collected' && (
                          <View style={styles.collectedBadge}>
                            <Ionicons name="checkmark-done" size={14} color="#fff" />
                            <Text style={styles.collectedText}>
                              {req.collectedAt 
                                ? `Collected on ${new Date(req.collectedAt).toLocaleDateString()}` 
                                : 'Collected'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
              
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Request New Items</Text>
                <Text style={styles.sectionSubtitle}>Available items:</Text>
                
                {items.length === 0 ? (
                  <View style={styles.noItemsContainer}>
                    <Ionicons name="cube-outline" size={40} color="#ccc" />
                    <Text style={styles.noItemsText}>No items available at the moment</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.itemsContainer}>
                      {items.map((item) => {
                        const isSelected = !!selectedItems[item._id];
                        const selectedData = selectedItems[item._id];
                        
                        return (
                          <TouchableOpacity key={item._id} style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                            onPress={() => toggleItemSelection(item)}>
                            <View style={styles.itemHeader}>
                              <View style={styles.itemInfo}>
                                <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>{item.name}</Text>
                                {item.category && <Text style={styles.itemCategory}>{item.category}</Text>}
                              </View>
                              {isSelected && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                            </View>
                            
                            <View style={styles.itemDetails}>
                              <View style={styles.quantityBadge}>
                                <Ionicons name="cube-outline" size={12} color={isSelected ? "#fff" : "#666"} />
                                <Text style={[styles.quantityText, isSelected && styles.quantityTextSelected]}>
                                  Available: {item.quantity} {item.unit || "pcs"}
                                </Text>
                              </View>
                              
                              {item.location && (
                                <View style={styles.locationBadge}>
                                  <Ionicons name="location-outline" size={12} color={isSelected ? "#fff" : "#666"} />
                                  <Text style={[styles.locationText, isSelected && styles.locationTextSelected]}>{item.location}</Text>
                                </View>
                              )}
                            </View>
                            
                            {isSelected && (
                              <View style={styles.quantitySelector}>
                                <TouchableOpacity style={styles.quantityBtn} onPress={() => updateItemQuantity(item._id, -1)}>
                                  <Ionicons name="remove" size={16} color="#fff" />
                                </TouchableOpacity>
                                <View style={styles.quantityDisplay}>
                                  <Text style={styles.quantityValue}>{selectedData.quantity}</Text>
                                  <Text style={styles.quantityLabel}>requesting</Text>
                                </View>
                                <TouchableOpacity style={styles.quantityBtn} onPress={() => updateItemQuantity(item._id, 1)}>
                                  <Ionicons name="add" size={16} color="#fff" />
                                </TouchableOpacity>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    
                    <TouchableOpacity style={[styles.submitButton, Object.keys(selectedItems).length === 0 && styles.submitButtonDisabled]} 
                      onPress={handleRequestItems} disabled={Object.keys(selectedItems).length === 0}>
                      <Ionicons name="send-outline" size={18} color="#fff" />
                      <Text style={styles.submitButtonText}>
                        Request {Object.keys(selectedItems).length} Item{Object.keys(selectedItems).length !== 1 ? 's' : ''}
                      </Text>
                    </TouchableOpacity>
                    
                    {Object.keys(selectedItems).length > 0 && (
                      <View style={styles.selectedSummary}>
                        <Text style={styles.summaryTitle}>Selected Items:</Text>
                        {Object.values(selectedItems).map(({ item, quantity }) => (
                          <View key={item._id} style={styles.summaryItem}>
                            <Text style={styles.summaryName}>{item.name}</Text>
                            <Text style={styles.summaryQuantity}>×{quantity}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) return (
    <View style={styles.centered}><ActivityIndicator size="large" color="#6200EE" /><Text style={styles.loadingText}>Loading...</Text></View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View><Text style={styles.greeting}>Welcome back</Text><Text style={styles.actorName}>{actor?.fullName}</Text></View>
              <TouchableOpacity onPress={() => navigation.navigate("Profile", { actorId })}>
                <Ionicons name="person-circle" size={40} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.stageNameBadge}><Ionicons name="star" size={16} color="#FFD700" /><Text style={styles.stageName}>{actor?.stageName}</Text></View>
              <Text style={styles.actorContact}><Ionicons name="mail-outline" size={14} color="#fff" /> {actor?.email}</Text>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Search plays..." value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery("")}><Ionicons name="close-circle" size={20} color="#666" /></TouchableOpacity>}
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tabButton, activeTab === "upcoming" && styles.tabButtonActive]} onPress={() => setActiveTab("upcoming")}>
              <Text style={[styles.tabText, activeTab === "upcoming" && styles.tabTextActive]}>Upcoming</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabButton, activeTab === "past" && styles.tabButtonActive]} onPress={() => setActiveTab("past")}>
              <Text style={[styles.tabText, activeTab === "past" && styles.tabTextActive]}>Past</Text>
            </TouchableOpacity>
          </View>

          <FlatList data={filteredPlays} keyExtractor={(item) => item._id} renderItem={renderPlay}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6200EE"]} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={80} color="#e0e0e0" />
                <Text style={styles.emptyTitle}>No {activeTab} plays</Text>
                <Text style={styles.emptySubtitle}>{searchQuery ? "Try different search" : "No assigned plays"}</Text>
              </View>
            }
            contentContainerStyle={styles.listContainer}
          />

          <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.replace("Login")}>
            <Ionicons name="log-out-outline" size={22} color="#fff" /><Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          {renderPlayDetailsModal()}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  loadingText: { marginTop: 15, color: "#666", fontSize: 16 },
  header: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, backgroundColor: "#6200EE", borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  greeting: { color: "#fff", fontSize: 14, opacity: 0.9 },
  actorName: { color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 2 },
  profileInfo: { marginTop: 5 },
  stageNameBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: "flex-start", marginBottom: 8 },
  stageName: { color: "#fff", fontSize: 14, fontWeight: "600", marginLeft: 5 },
  actorContact: { color: "#fff", fontSize: 14, opacity: 0.9 },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 20, marginTop: 20, marginBottom: 15, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: "#333" },
  tabContainer: { flexDirection: "row", marginHorizontal: 20, marginBottom: 15, backgroundColor: "#fff", borderRadius: 10, padding: 4 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabButtonActive: { backgroundColor: "#6200EE" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#666" },
  tabTextActive: { color: "#fff" },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  playCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, marginBottom: 15, padding: 15 },
  playImage: { width: 100, height: 100, borderRadius: 12 },
  playPlaceholder: { width: 100, height: 100, borderRadius: 12, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" },
  playInfo: { flex: 1, marginLeft: 15, justifyContent: "space-between" },
  playHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  playTitle: { fontSize: 18, fontWeight: "700", color: "#333", flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, minWidth: 80, alignItems: "center" },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  playDetails: { marginBottom: 12 },
  detailItem: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  detailText: { fontSize: 14, color: "#666", marginLeft: 6, flex: 1 },
  playFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  confirmButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#4CAF50", paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  confirmButtonText: { color: "#fff", fontSize: 14, fontWeight: "600", marginLeft: 6 },
  confirmedTag: { flexDirection: "row", alignItems: "center", backgroundColor: "#28a745", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  confirmedText: { color: "#fff", fontSize: 14, fontWeight: "600", marginLeft: 6 },
  detailsButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f0f0", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  detailsButtonText: { color: "#6200EE", fontSize: 14, fontWeight: "600", marginLeft: 4 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 20, marginBottom: 8, textAlign: "center" },
  emptySubtitle: { fontSize: 14, color: "#999", textAlign: "center", lineHeight: 20 },
  logoutButton: { position: "absolute", bottom: 25, right: 25, backgroundColor: "#6200EE", flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30 },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600", marginLeft: 8 },
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 25, borderTopRightRadius: 25, maxHeight: "90%", paddingTop: 20 },
  closeButtonTop: { position: "absolute", top: 20, right: 20, zIndex: 10, backgroundColor: "#f0f0f0", borderRadius: 20, padding: 5 },
  modalImage: { width: "100%", height: 200, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15 },
  modalTitle: { fontSize: 24, fontWeight: "700", color: "#333", flex: 1, marginRight: 10 },
  modalStatusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15 },
  modalStatusText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  modalDetailsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, marginBottom: 20 },
  modalDetailItem: { width: "50%", marginBottom: 15, paddingRight: 10 },
  modalDetailLabel: { fontSize: 12, color: "#999", marginTop: 4, marginBottom: 2 },
  modalDetailValue: { fontSize: 14, fontWeight: "600", color: "#333" },
  priceText: { color: "#4CAF50", fontSize: 16, fontWeight: "700" },
  modalSection: { paddingHorizontal: 20, marginBottom: 25 },
  modalSectionTitle: { fontSize: 18, fontWeight: "700", color: "#333", marginBottom: 10 },
  sectionSubtitle: { fontSize: 14, color: "#666", marginBottom: 15 },
  modalDescription: { fontSize: 15, lineHeight: 22, color: "#444" },
  actorItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8f9fa", padding: 12, borderRadius: 8, marginBottom: 8 },
  actorText: { fontSize: 14, color: "#333", marginLeft: 10, flex: 1 },
  confirmBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  confirmedBadge: { backgroundColor: "#28a745" },
  pendingBadge: { backgroundColor: "#ffc107" },
  confirmBadgeText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  collectionAlert: { flexDirection: "row", alignItems: "center", backgroundColor: "#4CAF50", padding: 12, borderRadius: 8, marginBottom: 15 },
  collectionAlertText: { color: "#fff", fontSize: 14, fontWeight: "600", marginLeft: 10 },
  requestItem: { backgroundColor: "#f8f9fa", borderRadius: 12, padding: 15, marginBottom: 12 },
  preparedRequest: { borderWidth: 2, borderColor: "#4CAF50", backgroundColor: "#f0f9f0" },
  requestHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  requestDate: { fontSize: 12, color: "#666", marginLeft: 8 },
  requestMaterials: { marginBottom: 10 },
  materialItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#eee" },
  materialName: { fontSize: 14, color: "#333" },
  materialQuantity: { fontSize: 14, fontWeight: "600", color: "#6200EE" },
  requestFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusBadgeSmall: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusTextSmall: { color: "#fff", fontSize: 11, fontWeight: "600" },
  collectButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#4CAF50", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  collectButtonText: { color: "#fff", fontSize: 12, fontWeight: "600", marginLeft: 5 },
  collectedBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#28a745", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  collectedText: { color: "#fff", fontSize: 11, fontWeight: "600", marginLeft: 5 },
  noDataText: { fontSize: 14, color: "#999", fontStyle: "italic" },
  itemsContainer: { marginBottom: 20 },
  itemCard: { backgroundColor: "#f8f9fa", borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: "transparent" },
  itemCardSelected: { backgroundColor: "#6200EE", borderColor: "#6200EE" },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 4 },
  itemNameSelected: { color: "#fff" },
  itemCategory: { fontSize: 12, color: "#666", backgroundColor: "#e9ecef", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start" },
  itemDetails: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  quantityBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginRight: 10 },
  quantityText: { fontSize: 12, color: "#666", marginLeft: 4 },
  quantityTextSelected: { color: "#fff" },
  locationBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  locationText: { fontSize: 12, color: "#666", marginLeft: 4 },
  locationTextSelected: { color: "#fff" },
  quantitySelector: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8, padding: 8 },
  quantityBtn: { backgroundColor: "rgba(255,255,255,0.3)", width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  quantityDisplay: { alignItems: "center" },
  quantityValue: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  quantityLabel: { fontSize: 10, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  noItemsContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  noItemsText: { fontSize: 14, color: "#999", marginTop: 10, textAlign: "center" },
  submitButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#6200EE", paddingVertical: 14, borderRadius: 12, marginTop: 10 },
  submitButtonDisabled: { backgroundColor: "#ccc" },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "600", marginLeft: 8 },
  selectedSummary: { backgroundColor: "#f0f0f0", borderRadius: 12, padding: 15, marginTop: 15 },
  summaryTitle: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  summaryItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  summaryName: { fontSize: 14, color: "#555", flex: 1 },
  summaryQuantity: { fontSize: 14, fontWeight: "600", color: "#6200EE", marginLeft: 10 },
  statusApproved: { backgroundColor: "#28a745" },
  statusRejected: { backgroundColor: "#dc3545" },
  statusPending: { backgroundColor: "#ffc107" },
  statusPrepared: { backgroundColor: "#4CAF50" },
  statusCollected: { backgroundColor: "#2196f3" },
});