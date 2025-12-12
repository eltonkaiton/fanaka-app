import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, RefreshControl, ScrollView, Modal, TextInput, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function InventoryHomeScreen({ navigation }) {
  const [loading,setLoading]=useState(true),
        [plays,setPlays]=useState([]),
        [refreshing,setRefreshing]=useState(false),
        [sidebarVisible,setSidebarVisible]=useState(false),
        [currentView,setCurrentView]=useState("dashboard"),
        [inventoryItems,setInventoryItems]=useState([]),
        [orders,setOrders]=useState([]),
        [modalVisible,setModalVisible]=useState(false),
        [orderModalVisible,setOrderModalVisible]=useState(false),
        [newItem,setNewItem]=useState({name:"",category:"",quantity:"",minThreshold:"",unit:""}),
        [orderData,setOrderData]=useState({itemId:"",itemName:"",quantity:"",supplier:""});

  // Fetching functions
  const fetchApprovedMaterials=async()=>{
    try{
      const res=await axios.get("http://192.168.100.13:5000/api/plays");
      const approved=res.data.map(p=>({...p,approvedMaterials:p.materialRequests?.filter(r=>r.status==="approved")})).filter(p=>p.approvedMaterials.length>0);
      setPlays(approved);
    }catch(err){
      console.log("Fetch Inventory Error:",err.response?.data||err);
      Alert.alert("Error","Unable to load approved materials.");
    }
  };

  const fetchInventoryItems=async()=>{
    try{
      const res=await axios.get("http://192.168.100.13:5000/api/items");
      setInventoryItems(res.data);
    }catch(err){
      console.log("Fetch Items Error:",err.response?.data||err);
      Alert.alert("Error","Unable to load inventory items.");
    }
  };

  const fetchOrders=async()=>{
    try{
      const res=await axios.get("http://192.168.100.13:5000/api/orders");
      setOrders(res.data);
    }catch(err){
      console.log("Fetch Orders Error:",err.response?.data||err);
      Alert.alert("Error","Unable to load orders.");
    }
  };

  const loadAllData=async()=>{
    setLoading(true);
    try{
      await Promise.all([fetchApprovedMaterials(),fetchInventoryItems(),fetchOrders()]);
    }catch(err){
      console.log("Load Data Error:",err);
    }finally{
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(()=>{loadAllData();},[]);
  const onRefresh=()=>{setRefreshing(true);loadAllData();};

  // Actions
  const markPrepared=async(playId,requestId)=>{
    try{
      await axios.patch(`http://192.168.100.13:5000/api/plays/${playId}/material-requests/${requestId}/prepare`);
      Alert.alert("Success","Materials marked as prepared.");
      fetchApprovedMaterials();
    }catch(err){
      console.log("Prepare Error:",err.response?.data||err);
      Alert.alert("Error","Could not update status.");
    }
  };

  const addNewItem=async()=>{
    if(!newItem.name||!newItem.category||!newItem.quantity||!newItem.unit){
      Alert.alert("Validation Error","Please fill all required fields");
      return;
    }
    try{
      await axios.post("http://192.168.100.13:5000/api/items",newItem);
      Alert.alert("Success","Item added successfully");
      setModalVisible(false);
      setNewItem({name:"",category:"",quantity:"",minThreshold:"",unit:""});
      fetchInventoryItems();
    }catch(err){
      console.log("Add Item Error:",err.response?.data||err);
      Alert.alert("Error","Failed to add item.");
    }
  };

  const createOrder=async()=>{
    if(!orderData.itemId || !orderData.quantity || !orderData.supplier){
      Alert.alert("Validation Error","Please fill all fields");
      return;
    }
    try{
      await axios.post("http://192.168.100.13:5000/api/orders",orderData);
      Alert.alert("Success","Order created successfully");
      setOrderModalVisible(false);
      setOrderData({itemId:"",itemName:"",quantity:"",supplier:""});
      fetchOrders();
      fetchInventoryItems();
    }catch(err){
      console.log("Create Order Error:",err.response?.data||err);
      Alert.alert("Error","Failed to create order.");
    }
  };

  const handleLogout=async()=>{
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("userType");
    navigation.replace("Login");
  };

  // Dashboard Card Component
  const DashboardCard=({icon,title,value,color,onPress})=>(
    <TouchableOpacity style={[styles.card,{borderLeftColor:color}]} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer,{backgroundColor:`${color}20`}]}><Ionicons name={icon} size={24} color={color}/></View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardValue}>{value}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardLink}>View Details</Text>
        <Ionicons name="arrow-forward" size={16} color={color}/>
      </View>
    </TouchableOpacity>
  );

  // Render Functions
  const renderDashboard=()=>(
    <ScrollView style={styles.content}>
      <Text style={styles.screenTitle}>Inventory Dashboard</Text>
      <View style={styles.statsRow}>
        <DashboardCard icon="cube-outline" title="Total Items" value={inventoryItems.length.toString()} color="#6200EE" onPress={()=>setCurrentView("items")}/>
        <DashboardCard icon="checkmark-circle-outline" title="Approved Requests" value={plays.reduce((acc,p)=>acc+p.approvedMaterials.length,0).toString()} color="#4CAF50" onPress={()=>setCurrentView("approved")}/>
      </View>
      <View style={styles.statsRow}>
        <DashboardCard icon="cart-outline" title="Pending Orders" value={orders.filter(o=>o.status==="pending").length.toString()} color="#FF9800" onPress={()=>setCurrentView("orders")}/>
        <DashboardCard icon="alert-circle-outline" title="Low Stock" value={inventoryItems.filter(item=>item.quantity<=item.minThreshold).length.toString()} color="#F44336" onPress={()=>setCurrentView("items")}/>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Approved Requests</Text>
        {plays.slice(0,3).map(play=>(
          <View key={play._id} style={styles.recentCard}>
            <Text style={styles.recentTitle}>{play.title}</Text>
            <Text style={styles.recentSubtitle}>{play.approvedMaterials.length} approved requests</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.addButton} onPress={()=>setModalVisible(true)}>
        <Ionicons name="add-circle" size={24} color="#fff"/>
        <Text style={styles.addButtonText}>Add New Item</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.addButton,{marginTop:15}]} onPress={()=>setOrderModalVisible(true)}>
        <Ionicons name="cart-outline" size={24} color="#fff"/>
        <Text style={styles.addButtonText}>Place New Order</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderApprovedRequests=()=>(
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Approved Material Requests</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}><Ionicons name="refresh" size={24} color="#6200EE"/></TouchableOpacity>
      </View>
      <FlatList
        data={plays}
        renderItem={({item})=>(
          <View style={styles.playCard}>
            <Text style={styles.playTitle}>{item.title}</Text>
            <Text style={styles.playDescription}>{item.description}</Text>
            <Text style={styles.subtitle}>Approved Requests:</Text>
            {item.approvedMaterials.map(req=>(
              <View key={req._id} style={styles.materialCard}>
                <View style={styles.materialHeader}>
                  <View style={styles.actorInfo}>
                    <Ionicons name="person-circle-outline" size={20} color="#6200EE"/>
                    <Text style={styles.actorText}>{req.actor.fullName} ({req.actor.stageName||"No Stage Name"})</Text>
                  </View>
                  <View style={[styles.statusBadge,{backgroundColor:"#4CAF5020"}]}>
                    <Text style={[styles.statusText,{color:"#4CAF50"}]}>APPROVED</Text>
                  </View>
                </View>
                <View style={styles.materialsList}>
                  <Ionicons name="cube-outline" size={16} color="#666"/>
                  <Text style={styles.materialList}>{req.materials.join(", ")}</Text>
                </View>
                <TouchableOpacity style={styles.prepareButton} onPress={()=>markPrepared(item._id,req._id)}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff"/>
                  <Text style={styles.prepareText}>Mark as Prepared</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        keyExtractor={item=>item._id}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="cube-outline" size={70} color="#aaa"/>
            <Text style={styles.emptyTitle}>No Approved Materials</Text>
            <Text style={styles.emptyText}>Approved materials from the play manager will appear here.</Text>
          </View>
        }
      />
    </View>
  );

  const renderInventoryItems=()=>(
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Inventory Items</Text>
        <TouchableOpacity style={styles.addButtonSmall} onPress={()=>setModalVisible(true)}>
          <Ionicons name="add" size={20} color="#fff"/>
          <Text style={styles.addButtonText}>Add Item</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={inventoryItems}
        renderItem={({item})=>(
          <View style={[styles.itemCard,item.quantity<=item.minThreshold&&styles.lowStockCard]}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={[styles.quantityBadge,item.quantity<=item.minThreshold&&styles.lowStockBadge]}>
                <Text style={styles.quantityText}>{item.quantity} {item.unit}</Text>
              </View>
            </View>
            <View style={styles.itemDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="pricetag-outline" size={16} color="#666"/>
                <Text style={styles.detailText}>Category: {item.category}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="alert-circle-outline" size={16} color="#666"/>
                <Text style={styles.detailText}>Min Threshold: {item.minThreshold}</Text>
              </View>
            </View>
            {item.quantity<=item.minThreshold && (
              <TouchableOpacity style={styles.orderButton} onPress={()=>{
                setOrderData({itemId:item._id,itemName:item.name,quantity:"",supplier:""});
                setOrderModalVisible(true);
              }}>
                <Ionicons name="cart-outline" size={18} color="#fff"/>
                <Text style={styles.orderButtonText}>Order More</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        keyExtractor={item=>item._id}
      />
    </View>
  );

  const renderOrders=()=>(
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Purchase Orders</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#6200EE"/>
        </TouchableOpacity>
      </View>
      <FlatList
        data={orders}
        renderItem={({item})=>(
          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderItem}>{item.itemName}</Text>
              <View style={[styles.statusBadge,{backgroundColor:item.status==="delivered"?"#4CAF5020":"#FF980020"}]}>
                <Text style={[styles.statusText,{color:item.status==="delivered"?"#4CAF50":"#FF9800"}]}>{item.status.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.orderDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="cube-outline" size={16} color="#666"/>
                <Text style={styles.detailText}>Quantity: {item.quantity}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color="#666"/>
                <Text style={styles.detailText}>Ordered: {new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
            </View>
          </View>
        )}
        keyExtractor={item=>item._id}
      />
    </View>
  );

  // Sidebar
  const Sidebar=()=>(
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <Ionicons name="cube" size={32} color="#6200EE"/>
        <Text style={styles.sidebarTitle}>Inventory</Text>
        <Text style={styles.sidebarSubtitle}>Management System</Text>
      </View>
      <ScrollView style={styles.sidebarMenu}>
        {["dashboard","approved","items","orders"].map(view=>{
          const iconMap={"dashboard":"home-outline","approved":"checkmark-circle-outline","items":"cube-outline","orders":"cart-outline"};
          const titleMap={"dashboard":"Dashboard","approved":"Approved Requests","items":"Inventory Items","orders":"Purchase Orders"};
          return(
            <TouchableOpacity key={view} style={[styles.menuItem,currentView===view&&styles.activeMenuItem]} onPress={()=>{setCurrentView(view);setSidebarVisible(false)}}>
              <Ionicons name={iconMap[view]} size={22} color={currentView===view?"#6200EE":"#666"}/>
              <Text style={[styles.menuText,currentView===view&&styles.activeMenuText]}>{titleMap[view]}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#fff"/>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  if(loading) return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color="#6200EE"/>
      <Text style={styles.loadingText}>Loading inventory data...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={()=>setSidebarVisible(!sidebarVisible)}>
          <Ionicons name="menu" size={28} color="#6200EE"/>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentView==="dashboard"?"Dashboard":currentView==="approved"?"Approved Requests":currentView==="items"?"Inventory Items":"Purchase Orders"}</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#6200EE"/>
        </TouchableOpacity>
      </View>

      {/* Sidebar Overlay */}
      {sidebarVisible&&<TouchableOpacity style={styles.overlay} onPress={()=>setSidebarVisible(false)} activeOpacity={1}/>}

      {/* Sidebar Container */}
      <View style={[styles.sidebarContainer,{transform:[{translateX:sidebarVisible?0:-width*0.8}]}]}>
        <Sidebar/>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {currentView==="dashboard"?renderDashboard():currentView==="approved"?renderApprovedRequests():currentView==="items"?renderInventoryItems():renderOrders()}
      </View>

      {/* Add Item Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={()=>setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Inventory Item</Text>
              <TouchableOpacity onPress={()=>setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666"/>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Item Name *</Text>
                <TextInput style={styles.input} value={newItem.name} onChangeText={text=>setNewItem({...newItem,name:text})} placeholder="Enter item name"/>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category *</Text>
                <TextInput style={styles.input} value={newItem.category} onChangeText={text=>setNewItem({...newItem,category:text})} placeholder="e.g., Costume, Prop, Makeup"/>
              </View>
              <View style={styles.row}>
                <View style={[styles.inputGroup,{flex:1,marginRight:10}]}>
                  <Text style={styles.inputLabel}>Quantity *</Text>
                  <TextInput style={styles.input} value={newItem.quantity} onChangeText={text=>setNewItem({...newItem,quantity:text})} placeholder="0" keyboardType="numeric"/>
                </View>
                <View style={[styles.inputGroup,{flex:1}]}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <TextInput style={styles.input} value={newItem.unit} onChangeText={text=>setNewItem({...newItem,unit:text})} placeholder="e.g., pieces, liters"/>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Minimum Threshold</Text>
                <TextInput style={styles.input} value={newItem.minThreshold} onChangeText={text=>setNewItem({...newItem,minThreshold:text})} placeholder="Alert when below this number" keyboardType="numeric"/>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={()=>setModalVisible(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={addNewItem}><Text style={styles.saveButtonText}>Save Item</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Order Modal */}
      <Modal animationType="slide" transparent={true} visible={orderModalVisible} onRequestClose={()=>setOrderModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Place New Order</Text>
              <TouchableOpacity onPress={()=>setOrderModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666"/>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Item *</Text>
                {inventoryItems.map(item=>(
                  <TouchableOpacity key={item._id} style={[styles.itemCard,{marginBottom:10,backgroundColor:orderData.itemId===item._id?"#6200EE20":"#f8f9fa"}]} onPress={()=>setOrderData({...orderData,itemId:item._id,itemName:item.name})}>
                    <Text style={{fontSize:16,color:"#333"}}>{item.name} ({item.quantity} {item.unit} available)</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quantity *</Text>
                <TextInput style={styles.input} value={orderData.quantity} onChangeText={text=>setOrderData({...orderData,quantity:text})} keyboardType="numeric" placeholder="Enter quantity"/>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Supplier *</Text>
                <TextInput style={styles.input} value={orderData.supplier} onChangeText={text=>setOrderData({...orderData,supplier:text})} placeholder="Enter supplier name"/>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={()=>setOrderModalVisible(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={createOrder}><Text style={styles.saveButtonText}>Place Order</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// Paste your existing styles object here
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:"#f8f9fa"},
  loadingScreen:{flex:1,justifyContent:"center",alignItems:"center",backgroundColor:"#f8f9fa"},
  loadingText:{marginTop:10,fontSize:16,color:"#666"},
  topHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:20,paddingVertical:15,backgroundColor:"#fff",elevation:3,shadowColor:"#000",shadowOffset:{width:0,height:2},shadowOpacity:0.1,shadowRadius:3},
  headerTitle:{fontSize:20,fontWeight:"bold",color:"#333"},
  overlay:{position:"absolute",top:0,left:0,right:0,bottom:0,backgroundColor:"rgba(0,0,0,0.5)",zIndex:999},
  sidebarContainer:{position:"absolute",top:0,left:0,bottom:0,width:width*0.8,backgroundColor:"#fff",zIndex:1000,elevation:10},
  sidebar:{flex:1,backgroundColor:"#fff"},
  sidebarHeader:{padding:30,backgroundColor:"#f8f9fa",borderBottomWidth:1,borderBottomColor:"#eee",alignItems:"center"},
  sidebarTitle:{fontSize:24,fontWeight:"bold",color:"#333",marginTop:10},
  sidebarSubtitle:{fontSize:14,color:"#666",marginTop:5},
  sidebarMenu:{flex:1,paddingVertical:20},
  menuItem:{flexDirection:"row",alignItems:"center",paddingVertical:15,paddingHorizontal:25,marginVertical:2},
  activeMenuItem:{backgroundColor:"#6200EE10",borderLeftWidth:4,borderLeftColor:"#6200EE"},
  menuText:{fontSize:16,color:"#666",marginLeft:15},
  activeMenuText:{color:"#6200EE",fontWeight:"600"},
  logoutButton:{flexDirection:"row",alignItems:"center",justifyContent:"center",backgroundColor:"#F44336",margin:20,padding:15,borderRadius:10},
  logoutText:{color:"#fff",fontSize:16,fontWeight:"600",marginLeft:10},
  mainContent:{flex:1},
  content:{flex:1,padding:20},
  screenTitle:{fontSize:24,fontWeight:"bold",color:"#333",marginBottom:20},
  header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:20},
  statsRow:{flexDirection:"row",justifyContent:"space-between",marginBottom:15},
  card:{flex:1,backgroundColor:"#fff",borderRadius:15,padding:20,marginHorizontal:5,borderLeftWidth:5,elevation:3,shadowColor:"#000",shadowOffset:{width:0,height:2},shadowOpacity:0.1,shadowRadius:4},
  cardHeader:{flexDirection:"row",alignItems:"center",marginBottom:10},
  iconContainer:{width:45,height:45,borderRadius:12,justifyContent:"center",alignItems:"center",marginRight:12},
  cardTitle:{fontSize:14,color:"#666",fontWeight:"500"},
  cardValue:{fontSize:32,fontWeight:"bold",color:"#333",marginBottom:10},
  cardFooter:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  cardLink:{fontSize:12,color:"#666"},
  section:{backgroundColor:"#fff",borderRadius:15,padding:20,marginBottom:20,elevation:2},
  sectionTitle:{fontSize:18,fontWeight:"bold",color:"#333",marginBottom:15},
  recentCard:{backgroundColor:"#f8f9fa",padding:15,borderRadius:10,marginBottom:10},
  recentTitle:{fontSize:16,fontWeight:"600",color:"#333",marginBottom:5},
  recentSubtitle:{fontSize:14,color:"#666"},
  addButton:{flexDirection:"row",alignItems:"center",justifyContent:"center",backgroundColor:"#6200EE",padding:18,borderRadius:15,elevation:3},
  addButtonSmall:{flexDirection:"row",alignItems:"center",backgroundColor:"#6200EE",paddingHorizontal:15,paddingVertical:10,borderRadius:10},
  addButtonText:{color:"#fff",fontSize:16,fontWeight:"600",marginLeft:8},
  refreshButton:{padding:8},
  playCard:{backgroundColor:"#fff",borderRadius:15,padding:20,marginBottom:15,elevation:3},
  playTitle:{fontSize:20,fontWeight:"bold",color:"#333",marginBottom:5},
  playDescription:{fontSize:14,color:"#666",marginBottom:15},
  subtitle:{fontSize:16,fontWeight:"600",color:"#444",marginBottom:10},
  materialCard:{backgroundColor:"#f8f9fa",borderRadius:12,padding:15,marginBottom:10},
  materialHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:10},
  actorInfo:{flexDirection:"row",alignItems:"center"},
  actorText:{fontSize:15,fontWeight:"600",color:"#333",marginLeft:8},
  statusBadge:{paddingHorizontal:10,paddingVertical:5,borderRadius:20},
  statusText:{fontSize:12,fontWeight:"700"},
  materialsList:{flexDirection:"row",alignItems:"flex-start",marginBottom:10},
  materialList:{fontSize:14,color:"#333",marginLeft:8,flex:1},
  prepareButton:{flexDirection:"row",alignItems:"center",justifyContent:"center",backgroundColor:"#4CAF50",padding:12,borderRadius:8,marginTop:5},
  prepareText:{color:"#fff",fontWeight:"600",marginLeft:8},
  itemCard:{backgroundColor:"#fff",borderRadius:12,padding:15,marginBottom:10,elevation:2},
  lowStockCard:{borderLeftWidth:4,borderLeftColor:"#F44336"},
  itemHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:10},
  itemName:{fontSize:17,fontWeight:"600",color:"#333",flex:1},
  quantityBadge:{backgroundColor:"#e3f2fd",paddingHorizontal:12,paddingVertical:6,borderRadius:20},
  lowStockBadge:{backgroundColor:"#ffebee"},
  quantityText:{fontSize:14,fontWeight:"600",color:"#1976d2"},
  itemDetails:{marginBottom:10},
  detailRow:{flexDirection:"row",alignItems:"center",marginBottom:5},
  detailText:{fontSize:14,color:"#666",marginLeft:8},
  orderButton:{flexDirection:"row",alignItems:"center",justifyContent:"center",backgroundColor:"#F44336",padding:10,borderRadius:8,marginTop:5},
  orderButtonText:{color:"#fff",fontSize:14,fontWeight:"600",marginLeft:8},
  orderCard:{backgroundColor:"#fff",borderRadius:12,padding:15,marginBottom:10,elevation:2},
  orderHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:10},
  orderItem:{fontSize:16,fontWeight:"600",color:"#333",flex:1},
  orderDetails:{marginTop:5},
  emptyBox:{alignItems:"center",justifyContent:"center",paddingVertical:50},
  emptyTitle:{fontSize:20,fontWeight:"bold",color:"#666",marginTop:15,marginBottom:5},
  emptyText:{fontSize:15,color:"#999",textAlign:"center",width:"80%"},
  modalContainer:{flex:1,justifyContent:"flex-end",backgroundColor:"rgba(0,0,0,0.5)"},
  modalContent:{backgroundColor:"#fff",borderTopLeftRadius:20,borderTopRightRadius:20,maxHeight:"80%"},
  modalHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",padding:20,borderBottomWidth:1,borderBottomColor:"#eee"},
  modalTitle:{fontSize:20,fontWeight:"bold",color:"#333"},
  modalForm:{padding:20},
  inputGroup:{marginBottom:20},
  row:{flexDirection:"row",marginBottom:20},
  inputLabel:{fontSize:14,fontWeight:"600",color:"#333",marginBottom:8},
  input:{borderWidth:1,borderColor:"#ddd",borderRadius:10,padding:12,fontSize:16,backgroundColor:"#f9f9f9"},
  modalFooter:{flexDirection:"row",padding:20,borderTopWidth:1,borderTopColor:"#eee"},
  cancelButton:{flex:1,padding:15,backgroundColor:"#f5f5f5",borderRadius:10,marginRight:10,alignItems:"center"},
  cancelButtonText:{color:"#666",fontSize:16,fontWeight:"600"},
  saveButton:{flex:1,padding:15,backgroundColor:"#6200EE",borderRadius:10,alignItems:"center"},
  saveButtonText:{color:"#fff",fontSize:16,fontWeight:"600"}
});
