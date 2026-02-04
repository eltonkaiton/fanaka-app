import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  Image,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated
} from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'http://192.168.0.103:5000';

const HomeScreen = ({ navigation }) => {
  const [plays, setPlays] = useState([]);
  const [filteredPlays, setFilteredPlays] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredPlays, setFeaturedPlays] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef();

  const categories = [
    { id: 'all', label: 'All Plays' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'thisWeek', label: 'This Week' },
    { id: 'popular', label: 'Popular' },
  ];

  useEffect(() => {
    fetchPlays();
  }, []);

  useEffect(() => {
    filterAndSortPlays();
  }, [search, plays, activeCategory]);

  const fetchPlays = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/plays`);
      const sortedPlays = response.data.sort((a, b) => 
        new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt)
      );
      setPlays(sortedPlays);
      
      // Set featured plays (first 3 plays)
      setFeaturedPlays(sortedPlays.slice(0, 3));
    } catch (error) {
      console.log('Error fetching plays:', error);
      Alert.alert('Error', 'Failed to fetch plays. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlays();
  };

  const filterAndSortPlays = () => {
    let filtered = [...plays];
    
    // Apply search filter
    if (search.trim() !== '') {
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        p.venue?.toLowerCase().includes(search.toLowerCase()) ||
        p.actors?.some(actor => 
          actor.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
    
    // Apply category filter
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    switch (activeCategory) {
      case 'upcoming':
        filtered = filtered.filter(play => 
          new Date(play.date) > now
        );
        break;
      case 'thisWeek':
        filtered = filtered.filter(play => {
          const playDate = new Date(play.date);
          return playDate > now && playDate <= oneWeekFromNow;
        });
        break;
      case 'popular':
        // Assuming popular plays are those with most bookings
        // You might want to implement actual popularity logic
        filtered = filtered.slice(0, 6);
        break;
      default:
        // 'all' - show all plays
        break;
    }
    
    // Sort by date (most recent first)
    filtered.sort((a, b) => 
      new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
    );
    
    setFilteredPlays(filtered);
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return 'https://images.unsplash.com/photo-1531263060786-566ad8b6d79d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_BASE_URL}${imagePath}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date TBD';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(date - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric' 
    });
  };

  const getDayOfWeek = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderFeaturedPlay = ({ item, index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width
    ];
    
    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [0, -20, 0],
      extrapolate: 'clamp'
    });

    return (
      <Animated.View style={[styles.featuredCard, { transform: [{ translateY }] }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('PlayDetails', { playId: item._id })}
        >
          <Image
            source={{ uri: getImageUrl(item.image) }}
            style={styles.featuredImage}
          />
          <View style={styles.featuredOverlay}>
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.featuredBadgeText}>FEATURED</Text>
            </View>
            <View style={styles.featuredContent}>
              <Text style={styles.featuredTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.featuredDetails}>
                <View style={styles.featuredDetail}>
                  <Ionicons name="calendar" size={14} color="#fff" />
                  <Text style={styles.featuredDetailText}>
                    {formatDate(item.date)}
                  </Text>
                </View>
                <View style={styles.featuredDetail}>
                  <Ionicons name="time" size={14} color="#fff" />
                  <Text style={styles.featuredDetailText}>
                    {getTime(item.date)}
                  </Text>
                </View>
                <View style={styles.featuredDetail}>
                  <Ionicons name="location" size={14} color="#fff" />
                  <Text style={styles.featuredDetailText} numberOfLines={1}>
                    {item.venue || 'Main Theater'}
                  </Text>
                </View>
              </View>
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>
                  FROM KES {item.regularPrice || 1500}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCategoryButton = (category) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryButton,
        activeCategory === category.id && styles.categoryButtonActive
      ]}
      onPress={() => setActiveCategory(category.id)}
    >
      <Text style={[
        styles.categoryButtonText,
        activeCategory === category.id && styles.categoryButtonTextActive
      ]}>
        {category.label}
      </Text>
    </TouchableOpacity>
  );

  const renderPlayCard = ({ item }) => {
    const imageUrl = getImageUrl(item.image);
    const isUpcoming = new Date(item.date) > new Date();
    
    return (
      <TouchableOpacity
        style={styles.playCard}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('PlayDetails', { playId: item._id })}
      >
        <View style={styles.playCardImageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.playCardImage}
          />
          {isUpcoming && (
            <View style={styles.upcomingBadge}>
              <Ionicons name="calendar" size={12} color="#fff" />
              <Text style={styles.upcomingBadgeText}>UPCOMING</Text>
            </View>
          )}
          <View style={styles.playCardPrice}>
            <Text style={styles.playCardPriceText}>
              KES {item.regularPrice || 1500}
            </Text>
          </View>
        </View>
        
        <View style={styles.playCardContent}>
          <Text style={styles.playCardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          
          <View style={styles.playCardDetails}>
            <View style={styles.playCardDetail}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.playCardDetailText}>
                {formatDate(item.date)}
              </Text>
            </View>
            
            <View style={styles.playCardDetail}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.playCardDetailText}>
                {getTime(item.date)}
              </Text>
            </View>
            
            <View style={styles.playCardDetail}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.playCardDetailText} numberOfLines={1}>
                {item.venue || 'Main Theater'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.playCardDescription} numberOfLines={2}>
            {item.description || 'Experience an amazing theatrical performance'}
          </Text>
          
          <View style={styles.playCardFooter}>
            {item.actors && item.actors.length > 0 && (
              <View style={styles.actorsContainer}>
                <Ionicons name="people-outline" size={14} color="#666" />
                <Text style={styles.actorsText} numberOfLines={1}>
                  Starring: {item.actors.slice(0, 2).join(', ')}
                  {item.actors.length > 2 && '...'}
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.bookButton}
              onPress={() => navigation.navigate('PlayDetails', { playId: item._id })}
            >
              <Text style={styles.bookButtonText}>Book Now</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="theater" size={80} color="#e0e0e0" />
      <Text style={styles.emptyTitle}>No Plays Found</Text>
      <Text style={styles.emptyText}>
        {search.trim() !== '' 
          ? `No plays match "${search}"`
          : `No ${activeCategory !== 'all' ? activeCategory + ' ' : ''}plays available`
        }
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => {
          setSearch('');
          setActiveCategory('all');
        }}
      >
        <Text style={styles.emptyButtonText}>View All Plays</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Loading amazing plays...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6200EE']}
            tintColor="#6200EE"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.appName}>Fanaka Arts</Text>
            <Text style={styles.tagline}>Experience World-Class Theater</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('MyBookings')}
          >
            <Ionicons name="ticket" size={24} color="#6200EE" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search plays, actors, or venues..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#999"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Featured Plays Carousel */}
        {featuredPlays.length > 0 && (
          <View style={styles.featuredSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Plays</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            <Animated.FlatList
              ref={scrollViewRef}
              data={featuredPlays}
              keyExtractor={(item) => item._id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              renderItem={renderFeaturedPlay}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
              contentContainerStyle={styles.featuredList}
            />
            
            <View style={styles.pagination}>
              {featuredPlays.map((_, index) => {
                const inputRange = [
                  (index - 1) * width,
                  index * width,
                  (index + 1) * width
                ];
                
                const dotWidth = scrollX.interpolate({
                  inputRange,
                  outputRange: [8, 20, 8],
                  extrapolate: 'clamp'
                });
                
                const opacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.3, 1, 0.3],
                  extrapolate: 'clamp'
                });
                
                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.paginationDot,
                      {
                        width: dotWidth,
                        opacity: opacity
                      }
                    ]}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          >
            {categories.map(renderCategoryButton)}
          </ScrollView>
        </View>

        {/* Plays Grid */}
        <View style={styles.playsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeCategory === 'all' ? 'All Plays' : 
               activeCategory === 'upcoming' ? 'Upcoming Plays' :
               activeCategory === 'thisWeek' ? 'This Week' : 'Popular Plays'}
            </Text>
            <Text style={styles.playsCount}>
              {filteredPlays.length} {filteredPlays.length === 1 ? 'play' : 'plays'}
            </Text>
          </View>

          {filteredPlays.length > 0 ? (
            <FlatList
              data={filteredPlays}
              keyExtractor={(item) => item._id}
              renderItem={renderPlayCard}
              scrollEnabled={false}
              contentContainerStyle={styles.playsGrid}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
            />
          ) : (
            renderEmptyState()
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('MyBookings')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="ticket" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.quickActionText}>My Tickets</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => Alert.alert('Coming Soon', 'Special offers coming soon!')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="pricetag" size={24} color="#FF9800" />
            </View>
            <Text style={styles.quickActionText}>Special Offers</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => Alert.alert('Contact', 'Call us at: +254 712 345 678')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="call" size={24} color="#2196F3" />
            </View>
            <Text style={styles.quickActionText}>Contact Us</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024 Fanaka Arts Theater</Text>
          <Text style={styles.footerSubText}>Experience the magic of live performance</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { 
    flex: 1, 
    backgroundColor: "#f8f9fa" 
  },
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6200EE',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#666',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1BEE7',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
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
    color: '#333',
  },
  featuredSection: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#6200EE',
    fontWeight: '500',
  },
  featuredList: {
    paddingHorizontal: 10,
  },
  featuredCard: {
    width: width - 40,
    marginHorizontal: 10,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  featuredImage: {
    width: '100%',
    height: 250,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'space-between',
    padding: 20,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(98, 0, 238, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  featuredContent: {
    marginTop: 'auto',
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  featuredDetails: {
    marginBottom: 15,
  },
  featuredDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  featuredDetailText: {
    color: '#fff',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  priceTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  priceText: {
    color: '#6200EE',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    gap: 8,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6200EE',
  },
  categoriesSection: {
    marginBottom: 25,
  },
  categoriesList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 10,
  },
  categoryButtonActive: {
    backgroundColor: '#6200EE',
    borderColor: '#6200EE',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  playsSection: {
    marginBottom: 25,
  },
  playsCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  playsGrid: {
    paddingHorizontal: 15,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  playCard: {
    width: (width - 45) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  playCardImageContainer: {
    position: 'relative',
  },
  playCardImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  upcomingBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  upcomingBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  playCardPrice: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  playCardPriceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  playCardContent: {
    padding: 12,
  },
  playCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 20,
  },
  playCardDetails: {
    marginBottom: 8,
  },
  playCardDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  playCardDetailText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  playCardDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 12,
  },
  playCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actorsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 4,
  },
  actorsText: {
    fontSize: 10,
    color: '#6B7280',
    flex: 1,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: '#6200EE',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  footerSubText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});

export default HomeScreen;