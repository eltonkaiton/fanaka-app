import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, 
  Image, RefreshControl, ActivityIndicator, ScrollView, TextInput 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

// Define your API base URL
const API_BASE_URL = 'http://192.168.100.13:5000';

export default function ManagePlaysScreen({ navigation }) {
  const [plays, setPlays] = useState([]);
  const [filteredPlays, setFilteredPlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Helper function to get full image URL
  const getFullImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // If it's already a full URL (starts with http), return as-is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // If it's an absolute path (starts with /), prepend base URL
    if (imagePath.startsWith('/')) {
      return `${API_BASE_URL}${imagePath}`;
    }
    
    // If it's just a filename, assume it's in uploads folder
    return `${API_BASE_URL}/uploads/${imagePath}`;
  };

  const fetchPlays = async () => {
    try {
      console.log('Fetching plays from:', `${API_BASE_URL}/api/plays`);
      const response = await axios.get(`${API_BASE_URL}/api/plays`);
      
      // Process images to have full URLs
      const playsWithFullUrls = response.data.map(play => ({
        ...play,
        image: getFullImageUrl(play.image)
      }));
      
      console.log('Fetched plays:', playsWithFullUrls.length);
      setPlays(playsWithFullUrls);
      setFilteredPlays(playsWithFullUrls);
    } catch (error) {
      console.log('Fetch Plays Error:', error?.response?.data || error.message || error);
      Alert.alert('Error', 'Failed to fetch plays. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlays();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPlays(plays);
    } else {
      const filtered = plays.filter(play => 
        play.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        play.venue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (play.description && play.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredPlays(filtered);
    }
  }, [searchQuery, plays]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlays();
  };

  const handleDelete = async (id, title) => {
    Alert.alert(
      'Confirm Delete', 
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/api/plays/${id}`);
              Alert.alert('Success', 'Play deleted successfully!');
              fetchPlays();
            } catch (error) {
              console.log('Delete Play Error:', error?.response?.data || error);
              Alert.alert('Error', 'Failed to delete play.');
            }
          },
        },
      ]
    );
  };

  const handleApproveMaterial = async (playId, requestId) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/plays/${playId}/material-requests/${requestId}/approve`);
      Alert.alert('Success', 'Material request approved.');
      fetchPlays();
    } catch (error) {
      console.log('Approve Material Error:', error?.response?.data || error);
      Alert.alert('Error', 'Failed to approve material request.');
    }
  };

  const handleRejectMaterial = async (playId, requestId) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/plays/${playId}/material-requests/${requestId}/reject`);
      Alert.alert('Success', 'Material request rejected.');
      fetchPlays();
    } catch (error) {
      console.log('Reject Material Error:', error?.response?.data || error);
      Alert.alert('Error', 'Failed to reject material request.');
    }
  };

  const renderPlay = ({ item }) => {
    const imageUrl = getFullImageUrl(item.image);
    
    return (
      <View style={styles.playCard}>
        <View style={styles.imageSection}>
          {imageUrl ? (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.image} 
              resizeMode="cover" 
              onError={(error) => {
                console.log('Image loading error:', error.nativeEvent.error);
                console.log('Failed to load image from:', imageUrl);
              }}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="theater" size={60} color="#666" />
              <Text style={styles.placeholderText}>No Image Available</Text>
            </View>
          )}
          <View style={styles.imageOverlay}>
            <Text style={styles.imageTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.venueBadge}>
              <Ionicons name="location-outline" size={14} color="#fff" />
              <Text style={styles.venueText}>{item.venue}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item._id, item.title)}>
          <Ionicons name="trash-outline" size={22} color="#ff4444" />
        </TouchableOpacity>

        <View style={styles.detailsContainer}>
          <View style={styles.descriptionContainer}>
            <Ionicons name="document-text-outline" size={18} color="#6200EE" />
            <Text style={styles.descriptionText} numberOfLines={3}>
              {item.description || 'No description provided'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                {new Date(item.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.infoItem}>
              <Ionicons name="pricetag-outline" size={16} color="#666" />
              <Text style={styles.priceText}>${item.price || 0}</Text>
            </View>
          </View>

          <View style={styles.materialSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube-outline" size={18} color="#6200EE" />
              <Text style={styles.sectionTitle}>Material Requests</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.materialRequests?.length || 0}</Text>
              </View>
            </View>
            
            {item.materialRequests && item.materialRequests.length > 0 ? (
              <ScrollView style={styles.materialScroll} showsVerticalScrollIndicator={false}>
                {item.materialRequests.map((req) => (
                  <View key={req._id} style={[
                    styles.materialRequestCard,
                    req.status === 'approved' && styles.approvedCard,
                    req.status === 'rejected' && styles.rejectedCard
                  ]}>
                    <View style={styles.materialHeader}>
                      <View style={styles.actorInfo}>
                        <Ionicons name="person-outline" size={16} color="#666" />
                        <Text style={styles.actorName} numberOfLines={1}>
                          {req.actor?.fullName || 'Unknown Actor'}
                          {req.actor?.stageName && ` (${req.actor.stageName})`}
                        </Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        req.status === 'approved' && styles.statusApproved,
                        req.status === 'rejected' && styles.statusRejected,
                        (!req.status || req.status === 'pending') && styles.statusPending
                      ]}>
                        <Text style={styles.statusText}>
                          {req.status ? req.status.toUpperCase() : 'PENDING'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.materialsList}>
                      <Ionicons name="list-outline" size={14} color="#666" />
                      <Text style={styles.materialsText} numberOfLines={2}>
                        {req.materials?.join(', ') || 'No materials specified'}
                      </Text>
                    </View>
                    
                    {(req.status === 'pending' || !req.status) && (
                      <View style={styles.requestActions}>
                        <TouchableOpacity 
                          style={styles.approveButton} 
                          onPress={() => handleApproveMaterial(item._id, req._id)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                          <Text style={styles.actionButtonText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.rejectButton} 
                          onPress={() => handleRejectMaterial(item._id, req._id)}
                        >
                          <Ionicons name="close-circle-outline" size={16} color="#fff" />
                          <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noMaterialsContainer}>
                <Ionicons name="cube-outline" size={40} color="#ddd" />
                <Text style={styles.noMaterialsText}>No material requests</Text>
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={styles.assignButton} 
            onPress={() => navigation.navigate('AssignActors', { 
              playId: item._id, 
              playTitle: item.title 
            })}
          >
            <Ionicons name="people-outline" size={20} color="#fff" />
            <Text style={styles.assignButtonText}>Assign Actors</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Loading plays...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.listContainer}
        data={filteredPlays}
        keyExtractor={(item) => item._id}
        renderItem={renderPlay}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#6200EE']} 
            tintColor="#6200EE" 
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="theater-outline" size={100} color="#ddd" />
            <Text style={styles.emptyTitle}>No Plays Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'No matches for your search' : 'Create your first play to get started'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity 
                style={styles.addFirstButton} 
                onPress={() => navigation.navigate('AddPlay')}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.addFirstButtonText}>Create First Play</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Manage Plays</Text>
            <Text style={styles.headerSubtitle}>
              {filteredPlays.length} {filteredPlays.length === 1 ? 'play' : 'plays'} found
              {searchQuery && ` for "${searchQuery}"`}
            </Text>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by title, venue, or description..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
      />
      
      <TouchableOpacity 
        style={styles.floatingButton} 
        onPress={() => navigation.navigate('AddPlay')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f8f9fa' 
  },
  loadingText: { 
    marginTop: 12, 
    color: '#666', 
    fontSize: 16 
  },
  listContainer: { 
    paddingBottom: 100 
  },
  header: { 
    padding: 20, 
    paddingBottom: 10 
  },
  headerTitle: { 
    fontSize: 32, 
    fontWeight: '700', 
    color: '#1a1a1a' 
  },
  headerSubtitle: { 
    fontSize: 16, 
    color: '#666', 
    marginTop: 4, 
    marginBottom: 16 
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    borderWidth: 1, 
    borderColor: '#ddd' 
  },
  searchIcon: { 
    marginRight: 10 
  },
  searchInput: { 
    flex: 1, 
    height: 50, 
    fontSize: 16, 
    color: '#333' 
  },
  clearButton: { 
    padding: 8 
  },
  playCard: { 
    backgroundColor: '#fff', 
    marginHorizontal: 16, 
    marginBottom: 20, 
    borderRadius: 20, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 12, 
    elevation: 6, 
    overflow: 'hidden' 
  },
  imageSection: { 
    position: 'relative', 
    height: 200 
  },
  image: { 
    width: '100%', 
    height: '100%' 
  },
  placeholderImage: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: '#f0f0f0', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  placeholderText: { 
    marginTop: 8, 
    color: '#666', 
    fontSize: 14 
  },
  imageOverlay: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    padding: 16 
  },
  imageTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#fff', 
    marginBottom: 8 
  },
  venueBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(98, 0, 238, 0.8)', 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 12, 
    alignSelf: 'flex-start' 
  },
  venueText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '600', 
    marginLeft: 4 
  },
  deleteButton: { 
    position: 'absolute', 
    top: 16, 
    right: 16, 
    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 4, 
    elevation: 4 
  },
  detailsContainer: { 
    padding: 20 
  },
  descriptionContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 16 
  },
  descriptionText: { 
    flex: 1, 
    marginLeft: 12, 
    fontSize: 15, 
    color: '#444', 
    lineHeight: 22 
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20, 
    paddingBottom: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  infoItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  infoText: { 
    marginLeft: 8, 
    fontSize: 14, 
    color: '#666' 
  },
  separator: { 
    width: 1, 
    height: 20, 
    backgroundColor: '#ddd', 
    marginHorizontal: 16 
  },
  priceText: { 
    marginLeft: 8, 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#6200EE' 
  },
  materialSection: { 
    marginBottom: 20 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  sectionTitle: { 
    fontSize: 17, 
    fontWeight: '600', 
    color: '#1a1a1a', 
    marginLeft: 8, 
    marginRight: 12 
  },
  badge: { 
    backgroundColor: '#6200EE', 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 10 
  },
  badgeText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '600' 
  },
  materialScroll: { 
    maxHeight: 200 
  },
  materialRequestCard: { 
    backgroundColor: '#f8f9fa', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#eee' 
  },
  approvedCard: { 
    backgroundColor: 'rgba(40, 167, 69, 0.1)', 
    borderColor: 'rgba(40, 167, 69, 0.3)' 
  },
  rejectedCard: { 
    backgroundColor: 'rgba(255, 68, 68, 0.1)', 
    borderColor: 'rgba(255, 68, 68, 0.3)' 
  },
  materialHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  actorInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  actorName: { 
    marginLeft: 6, 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#333', 
    flex: 1 
  },
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    marginLeft: 8 
  },
  statusPending: { 
    backgroundColor: '#ffc107' 
  },
  statusApproved: { 
    backgroundColor: '#28a745' 
  },
  statusRejected: { 
    backgroundColor: '#dc3545' 
  },
  statusText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: '700' 
  },
  materialsList: { 
    flexDirection: 'row', 
    alignItems: 'flex-start' 
  },
  materialsText: { 
    flex: 1, 
    marginLeft: 8, 
    fontSize: 13, 
    color: '#555', 
    lineHeight: 18 
  },
  requestActions: { 
    flexDirection: 'row', 
    marginTop: 12, 
    gap: 8 
  },
  approveButton: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: '#28a745', 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 6 
  },
  rejectButton: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: '#dc3545', 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 6 
  },
  actionButtonText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 14 
  },
  noMaterialsContainer: { 
    alignItems: 'center', 
    padding: 30, 
    backgroundColor: '#f8f9fa', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#eee', 
    borderStyle: 'dashed' 
  },
  noMaterialsText: { 
    marginTop: 12, 
    fontSize: 14, 
    color: '#999', 
    fontStyle: 'italic' 
  },
  assignButton: { 
    flexDirection: 'row', 
    backgroundColor: '#6200EE', 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10 
  },
  assignButtonText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 16 
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 80 
  },
  emptyTitle: { 
    fontSize: 24, 
    fontWeight: '600', 
    color: '#666', 
    marginTop: 20 
  },
  emptySubtitle: { 
    fontSize: 16, 
    color: '#999', 
    marginTop: 8, 
    marginBottom: 30, 
    textAlign: 'center', 
    paddingHorizontal: 40 
  },
  addFirstButton: { 
    flexDirection: 'row', 
    backgroundColor: '#6200EE', 
    paddingHorizontal: 30, 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    gap: 8 
  },
  addFirstButtonText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 16 
  },
  floatingButton: { 
    position: 'absolute', 
    right: 24, 
    bottom: 24, 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: '#6200EE', 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 8 
  },
});