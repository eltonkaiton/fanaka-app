import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Image, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_BASE_URL = 'https://fanaka-server-1.onrender.com';

export default function ManagePlaysScreen({ navigation }) {
  const [plays, setPlays] = useState([]);
  const [filteredPlays, setFilteredPlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getFullImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/')) return `${API_BASE_URL}${imagePath}`;
    return `${API_BASE_URL}/uploads/${imagePath}`;
  };

  const fetchPlays = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/plays`);
      const playsWithFullUrls = response.data.map(play => ({
        ...play,
        image: getFullImageUrl(play.image)
      }));
      setPlays(playsWithFullUrls);
      setFilteredPlays(playsWithFullUrls);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch plays.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchPlays(); }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPlays(plays);
    } else {
      const filtered = plays.filter(play => 
        play.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        play.venue?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPlays(filtered);
    }
  }, [searchQuery, plays]);

  const onRefresh = () => { setRefreshing(true); fetchPlays(); };

  const handleDelete = async (id, title) => {
    Alert.alert('Confirm Delete', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await axios.delete(`${API_BASE_URL}/api/plays/${id}`); fetchPlays(); }
        catch (error) { Alert.alert('Error', 'Failed to delete.'); }
      }}
    ]);
  };

  const handleApproveMaterial = async (playId, requestId) => {
    try { await axios.patch(`${API_BASE_URL}/api/plays/${playId}/material-requests/${requestId}/approve`); fetchPlays(); }
    catch (error) { Alert.alert('Error', 'Failed to approve.'); }
  };

  const handleRejectMaterial = async (playId, requestId) => {
    try { await axios.patch(`${API_BASE_URL}/api/plays/${playId}/material-requests/${requestId}/reject`); fetchPlays(); }
    catch (error) { Alert.alert('Error', 'Failed to reject.'); }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Helper function to format materials array
  const formatMaterials = (materials) => {
    if (!materials || !Array.isArray(materials)) return 'No materials';
    
    return materials.map(material => {
      // If material is an object with a name property
      if (material && typeof material === 'object') {
        return material.name || material.title || material.materialName || JSON.stringify(material);
      }
      // If material is a string
      return material;
    }).join(', ');
  };

  const renderPlay = ({ item }) => {
    const imageUrl = getFullImageUrl(item.image);
    const hasMaterialRequests = item.materialRequests && item.materialRequests.length > 0;
    
    return (
      <View style={styles.playCard}>
        {/* Image Section */}
        <View style={styles.imageSection}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="theater" size={50} color="#666" />
            </View>
          )}
          <View style={styles.imageOverlay}>
            <Text style={styles.imageTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.venueBadge}>
              <Ionicons name="location-outline" size={14} color="#fff" />
              <Text style={styles.venueText}>{item.venue}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item._id, item.title)}>
            <Ionicons name="trash-outline" size={20} color="#ff4444" />
          </TouchableOpacity>
        </View>

        {/* Play Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.descriptionContainer}>
            <Ionicons name="document-text-outline" size={16} color="#6200EE" />
            <Text style={styles.descriptionText} numberOfLines={3}>{item.description || 'No description'}</Text>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(item.date)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={16} color="#666" />
              <Text style={styles.detailLabel}>Regular</Text>
              <Text style={styles.detailValue}>KES {item.regularPrice || 0}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="star-outline" size={16} color="#666" />
              <Text style={styles.detailLabel}>VIP</Text>
              <Text style={styles.detailValue}>KES {item.vipPrice || 0}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="diamond-outline" size={16} color="#666" />
              <Text style={styles.detailLabel}>VVIP</Text>
              <Text style={styles.detailValue}>KES {item.vvipPrice || 0}</Text>
            </View>
          </View>

          {/* Actors Count */}
          <View style={styles.actorsSection}>
            <Ionicons name="people-outline" size={16} color="#6200EE" />
            <Text style={styles.actorsText}>{item.actors?.length || 0} assigned actors</Text>
            <TouchableOpacity style={styles.assignButton} onPress={() => navigation.navigate('AssignActors', { playId: item._id, playTitle: item.title })}>
              <Text style={styles.assignButtonText}>Assign</Text>
            </TouchableOpacity>
          </View>

          {/* Material Requests */}
          <View style={styles.materialSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube-outline" size={16} color="#6200EE" />
              <Text style={styles.sectionTitle}>Material Requests</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{item.materialRequests?.length || 0}</Text></View>
            </View>
            
            {hasMaterialRequests ? (
              <View style={styles.materialsList}>
                {item.materialRequests.slice(0, 2).map((req) => (
                  <View key={req._id} style={[styles.requestCard, req.status === 'approved' && styles.approvedCard, req.status === 'rejected' && styles.rejectedCard]}>
                    <View style={styles.requestHeader}>
                      <Text style={styles.actorName} numberOfLines={1}>{req.actor?.fullName || req.actor?.name || 'Actor'}</Text>
                      <View style={[styles.statusBadge, 
                        req.status === 'approved' && styles.statusApproved,
                        req.status === 'rejected' && styles.statusRejected,
                        (!req.status || req.status === 'pending') && styles.statusPending]}>
                        <Text style={styles.statusText}>{req.status ? req.status.toUpperCase() : 'PENDING'}</Text>
                      </View>
                    </View>
                    <Text style={styles.materialsText} numberOfLines={2}>
                      {formatMaterials(req.materials)}
                    </Text>
                    {(!req.status || req.status === 'pending') && (
                      <View style={styles.requestActions}>
                        <TouchableOpacity style={styles.approveButton} onPress={() => handleApproveMaterial(item._id, req._id)}>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectButton} onPress={() => handleRejectMaterial(item._id, req._id)}>
                          <Ionicons name="close" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
                {item.materialRequests.length > 2 && (
                  <Text style={styles.moreText}>+{item.materialRequests.length - 2} more requests</Text>
                )}
              </View>
            ) : (
              <View style={styles.noMaterialsContainer}>
                <Ionicons name="cube-outline" size={30} color="#ddd" />
                <Text style={styles.noMaterialsText}>No material requests</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) return (
    <View style={styles.centered}><ActivityIndicator size="large" color="#6200EE" /><Text>Loading...</Text></View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredPlays}
        keyExtractor={(item) => item._id}
        renderItem={renderPlay}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6200EE']} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="theater-outline" size={80} color="#ddd" />
            <Text style={styles.emptyTitle}>No Plays</Text>
            <Text style={styles.emptySubtitle}>{searchQuery ? 'No matches' : 'Create your first play'}</Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Manage Plays</Text>
            <Text style={styles.headerSubtitle}>{filteredPlays.length} play{filteredPlays.length !== 1 ? 's' : ''} found</Text>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput style={styles.searchInput} placeholder="Search plays..." value={searchQuery} onChangeText={setSearchQuery} />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color="#999" /></TouchableOpacity>
              )}
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddPlay')}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  listContent: { paddingBottom: 100 },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' },
  headerSubtitle: { fontSize: 14, color: '#666', marginTop: 2, marginBottom: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 15, borderWidth: 1, borderColor: '#ddd' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 50, fontSize: 16, color: '#333' },
  
  playCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 20, borderRadius: 15, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  imageSection: { position: 'relative', height: 180 },
  image: { width: '100%', height: '100%' },
  placeholderImage: { width: '100%', height: '100%', backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 15 },
  imageTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  venueBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#6200EE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  venueText: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 5 },
  deleteButton: { position: 'absolute', top: 15, right: 15, backgroundColor: 'rgba(255,255,255,0.9)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  
  detailsContainer: { padding: 15 },
  descriptionContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  descriptionText: { flex: 1, marginLeft: 10, fontSize: 14, color: '#444', lineHeight: 20 },
  
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15 },
  detailItem: { width: '50%', marginBottom: 10 },
  detailLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 2 },
  
  actorsSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#eee', borderBottomWidth: 1, borderBottomColor: '#eee' },
  actorsText: { flex: 1, marginLeft: 10, fontSize: 14, color: '#666' },
  assignButton: { backgroundColor: '#6200EE', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  assignButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  
  materialSection: { marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 8, marginRight: 10 },
  badge: { backgroundColor: '#6200EE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  
  materialsList: { marginTop: 5 },
  requestCard: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  approvedCard: { backgroundColor: 'rgba(40,167,69,0.1)', borderColor: 'rgba(40,167,69,0.3)' },
  rejectedCard: { backgroundColor: 'rgba(255,68,68,0.1)', borderColor: 'rgba(255,68,68,0.3)' },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  actorName: { fontSize: 14, fontWeight: '500', color: '#333', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusPending: { backgroundColor: '#ffc107' },
  statusApproved: { backgroundColor: '#28a745' },
  statusRejected: { backgroundColor: '#dc3545' },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  materialsText: { fontSize: 13, color: '#666', marginBottom: 8, lineHeight: 18 },
  requestActions: { flexDirection: 'row', gap: 8 },
  approveButton: { flex: 1, backgroundColor: '#28a745', padding: 8, borderRadius: 6, alignItems: 'center' },
  rejectButton: { flex: 1, backgroundColor: '#dc3545', padding: 8, borderRadius: 6, alignItems: 'center' },
  moreText: { textAlign: 'center', fontSize: 12, color: '#6200EE', marginTop: 5, fontStyle: 'italic' },
  
  noMaterialsContainer: { alignItems: 'center', padding: 20, backgroundColor: '#f8f9fa', borderRadius: 10, borderWidth: 1, borderColor: '#eee', borderStyle: 'dashed' },
  noMaterialsText: { marginTop: 8, fontSize: 13, color: '#999' },
  
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#666', marginTop: 15 },
  emptySubtitle: { fontSize: 14, color: '#999', marginTop: 5, textAlign: 'center' },
  
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#6200EE', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
});