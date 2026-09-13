import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';

import { CampusTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { DataService } from '@/services/data-service';
import { Order, OrderStatus, FoodItem, FoodCategory, FoodCourtPayoutConfig } from '@/types';

const PRESET_DISHES = [
  {
    name: 'Vada Pav',
    category: 'Popular' as FoodCategory,
    price: '15',
    prep: '5',
    image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Masala Dosa',
    category: 'Meals' as FoodCategory,
    price: '45',
    prep: '15',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Cold Coffee',
    category: 'Drinks' as FoodCategory,
    price: '30',
    prep: '5',
    image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Veg Cheese Sandwich',
    category: 'Quick Bites' as FoodCategory,
    price: '40',
    prep: '8',
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Paneer Hakka Noodles',
    category: 'Meals' as FoodCategory,
    price: '70',
    prep: '12',
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Masala Chai',
    category: 'Drinks' as FoodCategory,
    price: '12',
    prep: '5',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80',
  },
];

export default function FoodCourtScreen() {
  const router = useRouter();
  const { college, profile, logout } = useAuth();

  // Mode: Live Orders vs Menu Management vs Bank & Payout
  const [viewMode, setViewMode] = useState<'orders' | 'menu' | 'payout'>('orders');

  // Food Court Bank & Payout Configuration State
  const [payoutConfig, setPayoutConfig] = useState<FoodCourtPayoutConfig | null>(null);
  const [showUpdateBankModal, setShowUpdateBankModal] = useState(false);
  const [bankNameInput, setBankNameInput] = useState('');
  const [accountHolderInput, setAccountHolderInput] = useState('');
  const [accountNumberInput, setAccountNumberInput] = useState('');
  const [confirmAccNumberInput, setConfirmAccNumberInput] = useState('');
  const [ifscInput, setIfscInput] = useState('');
  const [upiVpaInput, setUpiVpaInput] = useState('');
  const [businessNameInput, setBusinessNameInput] = useState('');
  const [gatewayProviderInput, setGatewayProviderInput] = useState<
    'UPI_DIRECT' | 'RAZORPAY_ROUTE' | 'CASHFREE_SPLIT' | 'PHONEPE_PG'
  >('UPI_DIRECT');
  const [settlementScheduleInput, setSettlementScheduleInput] = useState<
    'instant' | 't_plus_1' | 't_plus_2'
  >('instant');
  const [savingBank, setSavingBank] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [bankUpdateToast, setBankUpdateToast] = useState<string | null>(null);
  const [showStandeeModal, setShowStandeeModal] = useState(false);

  // Orders State
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('placed');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderForOtp, setSelectedOrderForOtp] = useState<Order | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpFeedback, setOtpFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Food Items & Menu Management State
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [menuSearch, setMenuSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Add Dish Modal
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [dishName, setDishName] = useState('');
  const [dishCategory, setDishCategory] = useState<FoodCategory>('Snacks');
  const [dishPrice, setDishPrice] = useState('');
  const [dishPrepTime, setDishPrepTime] = useState('10');
  const [dishDesc, setDishDesc] = useState('');
  const [dishIsVeg, setDishIsVeg] = useState(true);
  const [dishImageUrl, setDishImageUrl] = useState('');

  // Edit Dish Modal
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editPrepTime, setEditPrepTime] = useState('');
  const [editAvailable, setEditAvailable] = useState(true);

  const tabs: { key: OrderStatus | 'all'; label: string }[] = [
    { key: 'placed', label: 'New Orders' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'ready', label: 'Ready' },
    { key: 'completed', label: 'Completed' },
  ];

  const loadCanteenData = async () => {
    const activeCollegeId = college?.id || 'col_jspm_tathawade';
    try {
      const [ords, items, config] = await Promise.all([
        DataService.getOrders(activeCollegeId),
        DataService.getFoodItems(activeCollegeId, undefined, true),
        DataService.getPayoutConfig(profile?.assignedFoodCourtId || 'fc_jspm_main'),
      ]);
      setOrders(ords);
      setFoodItems(items);
      setPayoutConfig(config);
    } catch (e) {
      console.error('Error loading canteen data:', e);
    }
  };

  useEffect(() => {
    loadCanteenData();
    const interval = setInterval(loadCanteenData, 5000); // Polling for live canteen orders & updates
    return () => clearInterval(interval);
  }, [college]);

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'all') return true;
    return o.orderStatus === activeTab;
  });

  const filteredFoodItems = foodItems.filter((item) => {
    const matchesCat =
      selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !menuSearch.trim() ||
      item.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(menuSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await DataService.updateOrderStatus(orderId, nextStatus, profile?.name || 'Staff');
      await loadCanteenData();
    } catch (e: any) {
      alert(e.message || 'Status transition failed');
    }
  };

  const handleConfirmCash = async (orderId: string) => {
    try {
      await DataService.confirmCashPayment(orderId, profile?.name || 'Staff');
      await loadCanteenData();
    } catch (e: any) {
      alert(e.message || 'Payment update failed');
    }
  };

  const handleVerifyOtp = async () => {
    if (!selectedOrderForOtp || !enteredOtp.trim()) return;

    try {
      setOtpVerifying(true);
      setOtpFeedback(null);
      const res = await DataService.verifyPickupOtp(
        selectedOrderForOtp.id,
        enteredOtp.trim(),
        profile?.name || 'Staff'
      );
      setOtpFeedback(res);
      if (res.success) {
        await loadCanteenData();
        setTimeout(() => {
          setSelectedOrderForOtp(null);
          setEnteredOtp('');
          setOtpFeedback(null);
        }, 1500);
      }
    } catch (e: any) {
      setOtpFeedback({ success: false, message: e.message || 'Verification failed' });
    } finally {
      setOtpVerifying(false);
    }
  };

  // Stock and Price Handlers
  const handleToggleStock = async (itemId: string) => {
    try {
      await DataService.toggleFoodItemAvailability(itemId);
      await loadCanteenData();
    } catch (e: any) {
      alert(e.message || 'Failed to toggle availability');
    }
  };

  const handleAddDish = async () => {
    if (!dishName.trim() || !dishPrice.trim()) {
      alert('Please provide a dish name and price');
      return;
    }
    const priceNum = parseFloat(dishPrice.trim());
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Please enter a valid price in ₹');
      return;
    }
    const activeCollegeId = college?.id || 'col_jspm_tathawade';
    const newItem: FoodItem = {
      id: `food_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      collegeId: activeCollegeId,
      foodCourtId: profile?.assignedFoodCourtId || 'fc_jspm_main',
      name: dishName.trim(),
      category: dishCategory,
      description: dishDesc.trim() || 'Freshly prepared at the campus food counter.',
      price: priceNum,
      prepTimeMinutes: parseInt(dishPrepTime.trim(), 10) || 10,
      imageUrl:
        dishImageUrl.trim() ||
        'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=500&q=80',
      available: true,
      isVeg: dishIsVeg,
    };
    await DataService.addFoodItem(newItem);
    setShowAddDishModal(false);
    setDishName('');
    setDishPrice('');
    setDishDesc('');
    setDishImageUrl('');
    await loadCanteenData();
  };

  const handleStartEdit = (item: FoodItem) => {
    setEditingItem(item);
    setEditPrice(item.price.toString());
    setEditPrepTime(item.prepTimeMinutes.toString());
    setEditAvailable(item.available);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const priceNum = parseFloat(editPrice.trim());
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Please enter a valid price');
      return;
    }
    await DataService.updateFoodItem(editingItem.id, {
      price: priceNum,
      prepTimeMinutes: parseInt(editPrepTime.trim(), 10) || editingItem.prepTimeMinutes,
      available: editAvailable,
    });
    setEditingItem(null);
    await loadCanteenData();
  };

  const handleDeleteItem = async (itemId: string) => {
    await DataService.deleteFoodItem(itemId);
    await loadCanteenData();
  };

  // Bank & Payout Handlers
  const openUpdateBankModal = () => {
    if (payoutConfig) {
      setBankNameInput(payoutConfig.bankName);
      setAccountHolderInput(payoutConfig.accountHolderName);
      setAccountNumberInput(payoutConfig.accountNumber);
      setConfirmAccNumberInput(payoutConfig.accountNumber);
      setIfscInput(payoutConfig.ifscCode);
      setUpiVpaInput(payoutConfig.upiVpa);
      setBusinessNameInput(payoutConfig.businessName);
      setGatewayProviderInput(payoutConfig.gatewayProvider);
      setSettlementScheduleInput(payoutConfig.settlementSchedule);
    } else {
      setBankNameInput('HDFC Bank');
      setAccountHolderInput('Suresh Patil');
      setAccountNumberInput('50100492819283');
      setConfirmAccNumberInput('50100492819283');
      setIfscInput('HDFC0001234');
      setUpiVpaInput('suresh.canteen@okhdfcbank');
      setBusinessNameInput('JSPM Central Food Court');
      setGatewayProviderInput('UPI_DIRECT');
      setSettlementScheduleInput('instant');
    }
    setShowUpdateBankModal(true);
  };

  const handleSaveBankDetails = async () => {
    if (
      !accountNumberInput.trim() ||
      !ifscInput.trim() ||
      !upiVpaInput.trim() ||
      !accountHolderInput.trim()
    ) {
      alert(
        'Please fill in all mandatory bank fields: Account Number, IFSC, Account Holder Name, and Merchant UPI ID.'
      );
      return;
    }
    if (accountNumberInput.trim() !== confirmAccNumberInput.trim()) {
      alert('Account numbers do not match. Please verify your account number.');
      return;
    }
    if (ifscInput.trim().length < 8) {
      alert('Please enter a valid IFSC code (e.g. HDFC0001234 or SBIN0002145).');
      return;
    }
    if (!upiVpaInput.includes('@')) {
      alert('Please enter a valid UPI ID containing @ (e.g. canteen@okhdfcbank).');
      return;
    }

    setSavingBank(true);
    try {
      const updated = await DataService.updatePayoutConfig(
        payoutConfig?.foodCourtId || 'fc_jspm_main',
        {
          bankName: bankNameInput.trim() || 'HDFC Bank',
          accountHolderName: accountHolderInput.trim(),
          accountNumber: accountNumberInput.trim(),
          ifscCode: ifscInput.trim().toUpperCase(),
          upiVpa: upiVpaInput.trim().toLowerCase(),
          businessName: businessNameInput.trim() || 'JSPM Central Food Court',
          gatewayProvider: gatewayProviderInput,
          settlementSchedule: settlementScheduleInput,
          verified: true,
        }
      );
      setPayoutConfig(updated);
      setShowUpdateBankModal(false);
      setBankUpdateToast(
        `Receiving bank updated to ${updated.bankName}! Incoming student payments will now deposit directly to this account.`
      );
      setTimeout(() => setBankUpdateToast(null), 6000);
    } catch (err: any) {
      alert(err?.message || 'Failed to update bank details');
    } finally {
      setSavingBank(false);
    }
  };

  return (
    <View style={styles.safeContainer}>
      {/* FOOD COURT TOP NAV */}
      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          <View style={styles.badge}>
            <Ionicons name="fast-food" size={16} color={CampusTheme.colors.background} />
          </View>
          <View>
            <Text style={styles.navTitle}>FOOD COURT COUNTER</Text>
            <Text style={styles.navSub}>
              {college?.shortName} • {profile?.name || 'Suresh Patil'}
            </Text>
          </View>
        </View>

        <View style={styles.navRight}>
          <Pressable style={styles.switchPortalBtn} onPress={() => router.replace('/login')}>
            <Ionicons name="swap-horizontal" size={16} color={CampusTheme.colors.primary} />
            <Text style={styles.switchPortalText}>Portals</Text>
          </Pressable>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color={CampusTheme.colors.danger} />
          </Pressable>
        </View>
      </View>

      {/* TOP MODE SWITCHER */}
      <View style={styles.modeBar}>
        <Pressable
          style={[styles.modeBtn, viewMode === 'orders' && styles.activeModeBtn]}
          onPress={() => setViewMode('orders')}
        >
          <Ionicons
            name="receipt"
            size={15}
            color={viewMode === 'orders' ? CampusTheme.colors.background : CampusTheme.colors.primary}
          />
          <Text style={[styles.modeBtnText, viewMode === 'orders' && styles.activeModeBtnText]}>
            Orders ({orders.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.modeBtn, viewMode === 'menu' && styles.activeModeBtn]}
          onPress={() => setViewMode('menu')}
        >
          <Ionicons
            name="restaurant"
            size={15}
            color={viewMode === 'menu' ? CampusTheme.colors.background : CampusTheme.colors.primary}
          />
          <Text style={[styles.modeBtnText, viewMode === 'menu' && styles.activeModeBtnText]}>
            Menu ({foodItems.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.modeBtn, viewMode === 'payout' && styles.activeModeBtn]}
          onPress={() => setViewMode('payout')}
        >
          <Ionicons
            name="card"
            size={15}
            color={viewMode === 'payout' ? CampusTheme.colors.background : CampusTheme.colors.primary}
          />
          <Text style={[styles.modeBtnText, viewMode === 'payout' && styles.activeModeBtnText]}>
            Bank & Payout
          </Text>
        </Pressable>
      </View>

      {viewMode === 'orders' ? (
        <>
          {/* QUEUE STATUS TABS */}
          <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map((tab) => {
            const count = orders.filter((o) => o.orderStatus === tab.key).length;
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.queueTab, isActive && styles.activeQueueTab]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.queueTabText, isActive && styles.activeQueueTabText]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabCountBadge, isActive && styles.activeTabCountBadge]}>
                    <Text
                      style={[
                        styles.tabCountText,
                        isActive && styles.activeTabCountText,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ORDER LIST */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyQueue}>
            <Ionicons name="checkmark-done-circle" size={48} color={CampusTheme.colors.primary} />
            <Text style={styles.emptyTitle}>Queue is Clear</Text>
            <Text style={styles.emptySub}>No orders currently in {activeTab} stage.</Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderTopRow}>
                <View>
                  <Text style={styles.orderNum}>{order.orderNumber}</Text>
                  <Text style={styles.studentInfo}>
                    {order.studentName} ({order.studentIdentifier || 'Student'})
                  </Text>
                </View>

                <View style={styles.paymentStatusBadge}>
                  <Text style={styles.paymentStatusText}>
                    {order.paymentMethod} · {order.paymentStatus.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Items Breakdown */}
              <View style={styles.itemsList}>
                {order.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemQty}>{item.quantity}×</Text>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemPrice}>₹{item.subtotal}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Grand Total</Text>
                <Text style={styles.totalValue}>₹{order.total}</Text>
              </View>

              {/* Action Buttons based on order stage */}
              <View style={styles.orderActions}>
                {order.orderStatus === 'placed' && (
                  <Pressable
                    style={styles.actionBtnPrimary}
                    onPress={() => handleStatusChange(order.id, 'accepted')}
                  >
                    <Ionicons name="checkmark" size={16} color={CampusTheme.colors.background} />
                    <Text style={styles.actionBtnPrimaryText}>Accept Order</Text>
                  </Pressable>
                )}

                {order.orderStatus === 'accepted' && (
                  <Pressable
                    style={styles.actionBtnPrimary}
                    onPress={() => handleStatusChange(order.id, 'preparing')}
                  >
                    <Ionicons name="flame" size={16} color={CampusTheme.colors.background} />
                    <Text style={styles.actionBtnPrimaryText}>Start Preparing</Text>
                  </Pressable>
                )}

                {order.orderStatus === 'preparing' && (
                  <Pressable
                    style={styles.actionBtnReady}
                    onPress={() => handleStatusChange(order.id, 'ready')}
                  >
                    <Ionicons name="notifications" size={16} color={CampusTheme.colors.background} />
                    <Text style={styles.actionBtnReadyText}>Mark Ready & Alert Student</Text>
                  </Pressable>
                )}

                {order.orderStatus === 'ready' && (
                  <View style={styles.readyActions}>
                    {order.paymentMethod === 'CASH' &&
                      order.paymentStatus === 'cash_pending' && (
                        <Pressable
                          style={styles.cashConfirmBtn}
                          onPress={() => handleConfirmCash(order.id)}
                        >
                          <Ionicons name="cash" size={16} color="#0D1411" />
                          <Text style={styles.cashConfirmText}>Confirm Cash (₹{order.total})</Text>
                        </Pressable>
                      )}

                    <Pressable
                      style={styles.actionBtnOtp}
                      onPress={() => {
                        setSelectedOrderForOtp(order);
                        setEnteredOtp('');
                        setOtpFeedback(null);
                      }}
                    >
                      <Ionicons name="keypad" size={16} color={CampusTheme.colors.background} />
                      <Text style={styles.actionBtnOtpText}>Verify Pickup OTP</Text>
                    </Pressable>
                  </View>
                )}

                {order.orderStatus === 'completed' && (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={CampusTheme.colors.primary} />
                    <Text style={styles.completedText}>
                      Completed & Picked Up at{' '}
                      {order.pickupVerifiedAt
                        ? new Date(order.pickupVerifiedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'counter'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
        </>
      ) : viewMode === 'menu' ? (
        /* MENU & PRICING MANAGEMENT */
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          {/* MENU HEADER WITH METRICS & ADD DISH */}
          <View style={styles.menuHeaderCard}>
            <View style={styles.menuHeaderLeft}>
              <Text style={styles.menuHeaderTitle}>Canteen Item Catalog</Text>
              <Text style={styles.menuHeaderSub}>
                Full control for canteen staff: toggle in-stock, edit pricing, or add new dishes.
              </Text>
              <View style={styles.menuMetricsRow}>
                <View style={styles.menuMetricBadge}>
                  <Text style={styles.menuMetricBadgeText}>{foodItems.length} Total Dishes</Text>
                </View>
                <View style={[styles.menuMetricBadge, styles.inStockMetricBadge]}>
                  <Ionicons name="checkmark-circle" size={12} color="#34D399" />
                  <Text style={styles.inStockMetricText}>
                    {foodItems.filter((i) => i.available).length} In Stock
                  </Text>
                </View>
                <View style={[styles.menuMetricBadge, styles.soldOutMetricBadge]}>
                  <Ionicons name="close-circle" size={12} color="#F87171" />
                  <Text style={styles.soldOutMetricText}>
                    {foodItems.filter((i) => !i.available).length} Sold Out
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              style={styles.addDishBtn}
              onPress={() => {
                setDishName('');
                setDishPrice('');
                setDishDesc('');
                setDishImageUrl('');
                setShowAddDishModal(true);
              }}
            >
              <Ionicons name="add" size={18} color="#0D1411" />
              <Text style={styles.addDishBtnText}>+ Add Dish</Text>
            </Pressable>
          </View>

          {/* SEARCH BAR */}
          <View style={styles.menuSearchContainer}>
            <Ionicons name="search" size={18} color={CampusTheme.colors.textMuted} />
            <TextInput
              style={styles.menuSearchInput}
              placeholder="Search dishes or items..."
              placeholderTextColor={CampusTheme.colors.textDim}
              value={menuSearch}
              onChangeText={setMenuSearch}
            />
            {menuSearch ? (
              <Pressable onPress={() => setMenuSearch('')}>
                <Ionicons name="close-circle" size={18} color={CampusTheme.colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* CATEGORY FILTER PILLS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryPillsScroll}
          >
            {['All', 'Popular', 'Meals', 'Snacks', 'Drinks', 'Quick Bites'].map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  style={[styles.categoryPill, isSelected && styles.activeCategoryPill]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      isSelected && styles.activeCategoryPillText,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* FOOD ITEMS LIST */}
          <View style={styles.foodItemList}>
            {filteredFoodItems.length === 0 ? (
              <View style={styles.emptyQueue}>
                <Ionicons name="fast-food-outline" size={48} color={CampusTheme.colors.textDim} />
                <Text style={styles.emptyTitle}>No Dishes Found</Text>
                <Text style={styles.emptySub}>Add a new dish to your canteen menu.</Text>
              </View>
            ) : (
              filteredFoodItems.map((item) => (
                <View
                  key={item.id}
                  style={[styles.dishCard, !item.available && styles.dishCardSoldOut]}
                >
                  <View style={styles.dishTopRow}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.dishThumb} />
                    ) : (
                      <View style={styles.dishThumbPlaceholder}>
                        <Ionicons name="fast-food" size={24} color={CampusTheme.colors.primary} />
                      </View>
                    )}

                    <View style={styles.dishInfo}>
                      <View style={styles.dishTitleRow}>
                        <View
                          style={[
                            styles.vegBadge,
                            item.isVeg ? styles.vegBadgeVeg : styles.vegBadgeNonVeg,
                          ]}
                        >
                          <View
                            style={[
                              styles.vegDot,
                              item.isVeg ? styles.vegDotVeg : styles.vegDotNonVeg,
                            ]}
                          />
                        </View>
                        <Text style={styles.dishName}>{item.name}</Text>
                      </View>

                      <Text style={styles.dishCategoryMeta}>
                        {item.category} • Prep: {item.prepTimeMinutes}m
                      </Text>
                      <Text style={styles.dishDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                      <Text style={styles.dishPriceText}>₹{item.price}</Text>
                    </View>
                  </View>

                  {/* CONTROLS ROW: TOGGLE STOCK, EDIT PRICE, DELETE */}
                  <View style={styles.dishControlRow}>
                    <Pressable
                      style={[
                        styles.stockToggleBtn,
                        item.available
                          ? styles.stockToggleInStock
                          : styles.stockToggleSoldOut,
                      ]}
                      onPress={() => handleToggleStock(item.id)}
                    >
                      <Ionicons
                        name={item.available ? 'checkmark-circle' : 'close-circle'}
                        size={15}
                        color={item.available ? '#34D399' : '#F87171'}
                      />
                      <Text
                        style={[
                          styles.stockToggleBtnText,
                          item.available ? styles.stockInText : styles.stockOutText,
                        ]}
                      >
                        {item.available ? 'IN STOCK' : 'SOLD OUT'}
                      </Text>
                    </Pressable>

                    <View style={styles.dishActionButtons}>
                      <Pressable
                        style={styles.dishEditBtn}
                        onPress={() => handleStartEdit(item)}
                      >
                        <Ionicons name="create-outline" size={14} color={CampusTheme.colors.primary} />
                        <Text style={styles.dishEditBtnText}>Edit</Text>
                      </Pressable>

                      <Pressable
                        style={styles.dishDeleteBtn}
                        onPress={() => handleDeleteItem(item.id)}
                      >
                        <Ionicons name="trash-outline" size={15} color={CampusTheme.colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        /* BANK & PAYOUT DASHBOARD */
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          {/* HEADER CARD */}
          <View style={styles.bankHeaderCard}>
            <View style={styles.bankHeaderLeft}>
              <Text style={styles.bankHeaderTitle}>Direct Bank Payout & Settlement</Text>
              <Text style={styles.bankHeaderSub}>
                Manage where student canteen payments are deposited. When you update your receiving
                bank or UPI ID, all student checkout QR codes update immediately.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Pressable
                style={[
                  styles.updateBankBtn,
                  {
                    backgroundColor: '#1E3528',
                    borderWidth: 1,
                    borderColor: CampusTheme.colors.primary,
                  },
                ]}
                onPress={() => setShowStandeeModal(true)}
              >
                <Ionicons name="qr-code" size={15} color={CampusTheme.colors.primary} />
                <Text style={[styles.updateBankBtnText, { color: CampusTheme.colors.primary }]}>
                  Counter Standee QR
                </Text>
              </Pressable>

              <Pressable style={styles.updateBankBtn} onPress={openUpdateBankModal}>
                <Ionicons name="create-outline" size={15} color="#0D1411" />
                <Text style={styles.updateBankBtnText}>Update Receiving Bank</Text>
              </Pressable>
            </View>
          </View>

          {/* SUCCESS TOAST */}
          {bankUpdateToast && (
            <View style={styles.bankToastBox}>
              <Ionicons name="checkmark-circle" size={18} color="#34D399" />
              <Text style={styles.bankToastText}>{bankUpdateToast}</Text>
            </View>
          )}

          {/* HERO DESTINATION BANK CARD */}
          <View style={styles.bankHeroCard}>
            <View style={styles.bankHeroTop}>
              <View style={styles.bankLogoBox}>
                <View style={styles.bankIconCircle}>
                  <Ionicons name="business" size={22} color={CampusTheme.colors.primary} />
                </View>
                <View>
                  <Text style={styles.bankHeroName}>
                    {payoutConfig?.bankName || 'HDFC Bank'}
                  </Text>
                  <Text style={styles.bankHeroType}>
                    Primary Receiving Business Account
                  </Text>
                </View>
              </View>

              <View style={styles.verifiedPill}>
                <Ionicons name="checkmark-circle" size={13} color="#34D399" />
                <Text style={styles.verifiedPillText}>Penny-Drop Verified</Text>
              </View>
            </View>

            {/* DETAILS GRID */}
            <View style={styles.bankDetailsGrid}>
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Food Court / Outlet</Text>
                <Text style={styles.bankDetailVal}>
                  {payoutConfig?.businessName || 'JSPM Central Food Court'}
                </Text>
              </View>

              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Account Holder Name</Text>
                <Text style={styles.bankDetailVal}>
                  {payoutConfig?.accountHolderName || 'Suresh Patil'}
                </Text>
              </View>

              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Bank Account Number</Text>
                <View style={styles.accountNumberRow}>
                  <Text style={styles.accountNumberText}>
                    {showAccountNumber
                      ? payoutConfig?.accountNumber || '50100492819283'
                      : `•••• •••• •••• ${
                          payoutConfig?.accountNumber
                            ? payoutConfig.accountNumber.slice(-4)
                            : '9283'
                        }`}
                  </Text>
                  <Pressable
                    style={styles.revealBtn}
                    onPress={() => setShowAccountNumber(!showAccountNumber)}
                  >
                    <Ionicons
                      name={showAccountNumber ? 'eye-off-outline' : 'eye-outline'}
                      size={16}
                      color={CampusTheme.colors.primary}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>IFSC Code</Text>
                <Text style={styles.bankDetailVal}>
                  {payoutConfig?.ifscCode || 'HDFC0001234'}
                </Text>
              </View>

              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Merchant UPI ID (VPA)</Text>
                <Text style={styles.bankVpaHighlight}>
                  {payoutConfig?.upiVpa || 'suresh.canteen@okhdfcbank'}
                </Text>
              </View>

              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Routing Engine</Text>
                <Text style={[styles.bankDetailVal, { color: '#34D399' }]}>
                  {payoutConfig?.gatewayProvider === 'UPI_DIRECT'
                    ? 'Direct Dynamic UPI (0% MDR Fee)'
                    : payoutConfig?.gatewayProvider === 'RAZORPAY_ROUTE'
                    ? 'Razorpay Route (Marketplace Split)'
                    : payoutConfig?.gatewayProvider === 'CASHFREE_SPLIT'
                    ? 'Cashfree Easy Split'
                    : 'PhonePe PG'}
                </Text>
              </View>
            </View>

            {/* CARD FOOTER */}
            <View style={styles.bankHeroFooter}>
              <Pressable style={styles.changeBankBtn} onPress={openUpdateBankModal}>
                <Ionicons name="swap-horizontal" size={15} color={CampusTheme.colors.primary} />
                <Text style={styles.changeBankBtnText}>Change Receiving Bank / UPI</Text>
              </Pressable>

              <Text style={styles.syncMetaText}>
                Live Sync • Next student scan pays directly to this bank
              </Text>
            </View>
          </View>

          {/* FINANCIAL FLOW METRICS */}
          <View style={styles.payoutMetricsRow}>
            <View style={styles.payoutMetricCard}>
              <Text style={styles.payoutMetricLabel}>Today's UPI Revenue</Text>
              <Text style={styles.payoutMetricValue}>
                ₹
                {orders
                  .filter((o) => o.paymentMethod === 'UPI' && o.paymentStatus === 'paid')
                  .reduce((sum, o) => sum + o.total, 0) || 120}
              </Text>
              <Text style={styles.payoutMetricSub}>Directly credited in bank</Text>
            </View>

            <View style={styles.payoutMetricCard}>
              <Text style={styles.payoutMetricLabel}>Settlement Speed</Text>
              <Text style={styles.payoutMetricValue}>Instant</Text>
              <Text style={styles.payoutMetricSub}>Real-time bank transfer</Text>
            </View>

            <View style={styles.payoutMetricCard}>
              <Text style={styles.payoutMetricLabel}>MDR / Commission Fee</Text>
              <Text style={[styles.payoutMetricValue, { color: '#34D399' }]}>₹0 (0%)</Text>
              <Text style={styles.payoutMetricSub}>Zero deductions on UPI</Text>
            </View>
          </View>

          {/* HOW PAYMENT GATEWAY JOINING WORKS GUIDE */}
          <View style={styles.guideCard}>
            <View style={styles.guideHeader}>
              <Ionicons name="information-circle" size={20} color={CampusTheme.colors.primary} />
              <Text style={styles.guideTitle}>
                How Payment Gateway Joining Works for Canteen Owners
              </Text>
            </View>

            {/* OPTION 1 */}
            <View style={styles.guideOptionBox}>
              <View style={styles.guideOptionHeader}>
                <Text style={styles.guideOptionTitle}>
                  1. Direct Dynamic UPI (Active & Recommended)
                </Text>
                <View style={styles.guideOptionBadge}>
                  <Text style={styles.guideOptionBadgeText}>0% FEE</Text>
                </View>
              </View>
              <Text style={styles.guideOptionText}>
                Under RBI & NPCI rules, UPI merchant payments carry 0% MDR fee. Campus Connect
                generates a dynamic UPI URI and QR code with your active VPA. When a student pays
                via GPay, PhonePe, or Paytm, funds land immediately in your bank with zero
                intermediary hold.
              </Text>
            </View>

            {/* OPTION 2 */}
            <View style={styles.guideOptionBox}>
              <View style={styles.guideOptionHeader}>
                <Text style={styles.guideOptionTitle}>
                  2. Marketplace Route (Razorpay Route / Cashfree Split)
                </Text>
                <View
                  style={[
                    styles.guideOptionBadge,
                    { backgroundColor: 'rgba(96, 165, 250, 0.2)' },
                  ]}
                >
                  <Text style={[styles.guideOptionBadgeText, { color: '#60A5FA' }]}>
                    CARDS + NETBANKING
                  </Text>
                </View>
              </View>
              <Text style={styles.guideOptionText}>
                If you want to accept student Credit/Debit cards or split revenue automatically with
                the college cafeteria account (e.g. 95% to canteen owner, 5% to college facilities),
                your food court is linked as a Sub-Merchant account. Funds are settled on T+1
                schedule directly into your linked bank account.
              </Text>
            </View>

            {/* STEP BY STEP JOINING */}
            <Text style={[styles.inputLabel, { marginTop: 14, marginBottom: 8 }]}>
              5-Step Setup & Bank Switching Process:
            </Text>
            <View style={styles.stepsList}>
              <View style={styles.stepItem}>
                <Text style={styles.stepNum}>1</Text>
                <Text style={styles.stepText}>
                  Enter your business or proprietor bank account number, IFSC, and UPI ID in this
                  portal.
                </Text>
              </View>
              <View style={styles.stepItem}>
                <Text style={styles.stepNum}>2</Text>
                <Text style={styles.stepText}>
                  The system validates your IFSC and runs an automated Penny-Drop check (₹1 test
                  credit) to confirm account ownership.
                </Text>
              </View>
              <View style={styles.stepItem}>
                <Text style={styles.stepNum}>3</Text>
                <Text style={styles.stepText}>
                  Your account is instantly set as the active payout destination for this college
                  food court.
                </Text>
              </View>
              <View style={styles.stepItem}>
                <Text style={styles.stepNum}>4</Text>
                <Text style={styles.stepText}>
                  When students order from the Canteen tab, the QR code encodes your new bank UPI
                  handle in real time.
                </Text>
              </View>
              <View style={styles.stepItem}>
                <Text style={styles.stepNum}>5</Text>
                <Text style={styles.stepText}>
                  Need to switch banks later? Simply click "Change Receiving Bank", input your new
                  account, and all subsequent orders route to your new bank immediately!
                </Text>
              </View>
            </View>
          </View>

          {/* RECENT SETTLEMENT TRANSFERS LEDGER */}
          <View style={styles.guideCard}>
            <View style={styles.guideHeader}>
              <Ionicons name="receipt-outline" size={20} color={CampusTheme.colors.primary} />
              <Text style={styles.guideTitle}>Recent Direct Bank Settlements</Text>
            </View>

            {orders
              .filter((o) => o.paymentMethod === 'UPI')
              .slice(0, 4)
              .map((ord, idx) => (
                <View key={ord.id || idx} style={styles.settlementLogRow}>
                  <View style={styles.settlementLogLeft}>
                    <Text style={styles.settlementOrderNum}>
                      {ord.orderNumber} • {ord.studentName}
                    </Text>
                    <Text style={styles.settlementUtr}>
                      UTR: UPI{ord.id.slice(-10)} • {payoutConfig?.bankName || 'HDFC Bank'} (••••
                      {payoutConfig?.accountNumber ? payoutConfig.accountNumber.slice(-4) : '9283'}
                      )
                    </Text>
                  </View>
                  <View style={styles.settlementLogRight}>
                    <Text style={styles.settlementAmount}>+ ₹{ord.total}</Text>
                    <Text style={styles.settlementStatusBadge}>
                      {ord.paymentStatus === 'paid' ? '✓ Deposited' : 'Pending Verification'}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        </ScrollView>
      )}

      {/* ADD DISH MODAL */}
      {showAddDishModal && (
        <Modal
          visible={showAddDishModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddDishModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTop}>
                <Text style={styles.modalHeading}>Add New Dish to Canteen</Text>
                <Pressable onPress={() => setShowAddDishModal(false)}>
                  <Ionicons name="close-circle" size={24} color={CampusTheme.colors.textMuted} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {/* PRESET CHIPS */}
                <Text style={styles.inputLabel}>Quick Preset Fill</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.presetScroll}
                >
                  {PRESET_DISHES.map((p) => (
                    <Pressable
                      key={p.name}
                      style={styles.presetChip}
                      onPress={() => {
                        setDishName(p.name);
                        setDishCategory(p.category);
                        setDishPrice(p.price);
                        setDishPrepTime(p.prep);
                        setDishImageUrl(p.image);
                        setDishDesc(`Freshly prepared hot ${p.name} at canteen counter.`);
                      }}
                    >
                      <Ionicons name="flash" size={12} color={CampusTheme.colors.primary} />
                      <Text style={styles.presetChipText}>{p.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Dish Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Paneer Roll"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={dishName}
                  onChangeText={setDishName}
                />

                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Price (₹) *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 50"
                      placeholderTextColor={CampusTheme.colors.textDim}
                      keyboardType="numeric"
                      value={dishPrice}
                      onChangeText={setDishPrice}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Prep Time (mins)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 10"
                      placeholderTextColor={CampusTheme.colors.textDim}
                      keyboardType="numeric"
                      value={dishPrepTime}
                      onChangeText={setDishPrepTime}
                    />
                  </View>
                </View>

                {/* CATEGORY SELECTOR */}
                <Text style={styles.inputLabel}>Category</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.catSelectScroll}
                >
                  {(['Popular', 'Meals', 'Snacks', 'Drinks', 'Quick Bites'] as FoodCategory[]).map(
                    (cat) => (
                      <Pressable
                        key={cat}
                        style={[
                          styles.catSelectChip,
                          dishCategory === cat && styles.catSelectChipActive,
                        ]}
                        onPress={() => setDishCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.catSelectChipText,
                            dishCategory === cat && styles.catSelectChipTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </Pressable>
                    )
                  )}
                </ScrollView>

                {/* VEG / NON-VEG TOGGLE */}
                <View style={styles.vegToggleRow}>
                  <Text style={styles.inputLabel}>Food Type</Text>
                  <Pressable
                    style={[styles.vegToggleBtn, dishIsVeg && styles.vegToggleBtnActive]}
                    onPress={() => setDishIsVeg(!dishIsVeg)}
                  >
                    <View
                      style={[styles.vegDot, dishIsVeg ? styles.vegDotVeg : styles.vegDotNonVeg]}
                    />
                    <Text style={styles.vegToggleText}>
                      {dishIsVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Delicious ingredients and spices..."
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={dishDesc}
                  onChangeText={setDishDesc}
                />

                <Text style={styles.inputLabel}>Image URL</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={dishImageUrl}
                  onChangeText={setDishImageUrl}
                />
              </ScrollView>

              <Pressable style={styles.saveDishBtn} onPress={handleAddDish}>
                <Ionicons name="checkmark-circle" size={18} color="#0D1411" />
                <Text style={styles.saveDishBtnText}>Save Dish to Canteen</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* EDIT DISH MODAL */}
      {editingItem && (
        <Modal
          visible={!!editingItem}
          transparent
          animationType="fade"
          onRequestClose={() => setEditingItem(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTop}>
                <Text style={styles.modalHeading}>Edit: {editingItem.name}</Text>
                <Pressable onPress={() => setEditingItem(null)}>
                  <Ionicons name="close-circle" size={24} color={CampusTheme.colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>Price (₹)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Price in ₹"
                placeholderTextColor={CampusTheme.colors.textDim}
                keyboardType="numeric"
                value={editPrice}
                onChangeText={setEditPrice}
              />

              <Text style={styles.inputLabel}>Prep Time (minutes)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Minutes"
                placeholderTextColor={CampusTheme.colors.textDim}
                keyboardType="numeric"
                value={editPrepTime}
                onChangeText={setEditPrepTime}
              />

              <View style={styles.vegToggleRow}>
                <Text style={styles.inputLabel}>Stock Status</Text>
                <Pressable
                  style={[
                    styles.stockToggleBtn,
                    editAvailable ? styles.stockToggleInStock : styles.stockToggleSoldOut,
                  ]}
                  onPress={() => setEditAvailable(!editAvailable)}
                >
                  <Ionicons
                    name={editAvailable ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={editAvailable ? '#34D399' : '#F87171'}
                  />
                  <Text
                    style={[
                      styles.stockToggleBtnText,
                      editAvailable ? styles.stockInText : styles.stockOutText,
                    ]}
                  >
                    {editAvailable ? 'IN STOCK' : 'SOLD OUT'}
                  </Text>
                </Pressable>
              </View>

              <Pressable style={styles.saveDishBtn} onPress={handleSaveEdit}>
                <Ionicons name="checkmark-circle" size={18} color="#0D1411" />
                <Text style={styles.saveDishBtnText}>Update Dish Details</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* SECURE OTP VERIFICATION MODAL */}
      {selectedOrderForOtp && (
        <Modal
          visible={!!selectedOrderForOtp}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedOrderForOtp(null)}
        >
          <View style={styles.otpModalOverlay}>
            <View style={styles.otpModalCard}>
              <View style={styles.otpModalTop}>
                <View style={styles.otpIconCircle}>
                  <Ionicons name="shield-checkmark" size={24} color={CampusTheme.colors.background} />
                </View>
                <Pressable onPress={() => setSelectedOrderForOtp(null)}>
                  <Ionicons name="close-circle" size={26} color={CampusTheme.colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.otpModalTitle}>Verify Pickup OTP</Text>
              <Text style={styles.otpModalSubtitle}>
                Ask student <Text style={{ color: CampusTheme.colors.primary, fontWeight: '800' }}>{selectedOrderForOtp.studentName}</Text> for their 6-digit code for order {selectedOrderForOtp.orderNumber}.
              </Text>

              <TextInput
                style={styles.otpInput}
                placeholder="6-digit OTP (e.g. 482731)"
                placeholderTextColor={CampusTheme.colors.textDim}
                keyboardType="number-pad"
                maxLength={6}
                value={enteredOtp}
                onChangeText={setEnteredOtp}
              />

              {otpFeedback && (
                <View
                  style={[
                    styles.feedbackBox,
                    otpFeedback.success ? styles.feedbackSuccess : styles.feedbackError,
                  ]}
                >
                  <Ionicons
                    name={otpFeedback.success ? 'checkmark-circle' : 'alert-circle'}
                    size={18}
                    color={otpFeedback.success ? CampusTheme.colors.primary : CampusTheme.colors.danger}
                  />
                  <Text
                    style={[
                      styles.feedbackText,
                      otpFeedback.success ? styles.feedbackSuccessText : styles.feedbackErrorText,
                    ]}
                  >
                    {otpFeedback.message}
                  </Text>
                </View>
              )}

              <View style={styles.otpModalButtons}>
                <Pressable
                  style={[styles.verifyOtpBtn, otpVerifying && { opacity: 0.7 }]}
                  onPress={handleVerifyOtp}
                  disabled={otpVerifying}
                >
                  {otpVerifying ? (
                    <ActivityIndicator color={CampusTheme.colors.background} />
                  ) : (
                    <Text style={styles.verifyOtpBtnText}>Verify & Complete Pickup</Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.cancelOtpBtn}
                  onPress={() => setSelectedOrderForOtp(null)}
                >
                  <Text style={styles.cancelOtpBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* UPDATE DESTINATION BANK & PAYOUT MODAL */}
      {showUpdateBankModal && (
        <Modal
          visible={showUpdateBankModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUpdateBankModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTop}>
                <View>
                  <Text style={styles.modalHeading}>Change Destination Bank & UPI</Text>
                  <Text style={styles.bankHeaderSub}>
                    Payouts will immediately route to this new bank account.
                  </Text>
                </View>
                <Pressable onPress={() => setShowUpdateBankModal(false)}>
                  <Ionicons name="close-circle" size={24} color={CampusTheme.colors.textMuted} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
                {/* QUICK PRESET BANK PICKER */}
                <Text style={styles.inputLabel}>Quick Bank Presets</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.bankPresetScroll}
                >
                  {[
                    { name: 'HDFC Bank', ifsc: 'HDFC0001234', upi: 'okhdfcbank' },
                    { name: 'State Bank of India', ifsc: 'SBIN0002145', upi: 'oksbi' },
                    { name: 'ICICI Bank', ifsc: 'ICIC0000456', upi: 'okicici' },
                    { name: 'Axis Bank', ifsc: 'UTIB0000789', upi: 'okaxis' },
                    { name: 'Kotak Bank', ifsc: 'KKBK0000321', upi: 'kotak' },
                    { name: 'Bank of Baroda', ifsc: 'BARB0TATHAW', upi: 'barodampay' },
                  ].map((preset) => {
                    const isSelected = bankNameInput === preset.name;
                    return (
                      <Pressable
                        key={preset.name}
                        style={[
                          styles.bankPresetChip,
                          isSelected && styles.bankPresetChipActive,
                        ]}
                        onPress={() => {
                          setBankNameInput(preset.name);
                          setIfscInput(preset.ifsc);
                          const holderSlug =
                            accountHolderInput.trim().toLowerCase().split(' ')[0] || 'canteen';
                          setUpiVpaInput(`${holderSlug}@${preset.upi}`);
                        }}
                      >
                        <Text
                          style={[
                            styles.bankPresetChipText,
                            isSelected && styles.bankPresetChipTextActive,
                          ]}
                        >
                          {preset.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* OUTLET & HOLDER */}
                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Outlet / Business Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. JSPM Food Court"
                      placeholderTextColor={CampusTheme.colors.textDim}
                      value={businessNameInput}
                      onChangeText={setBusinessNameInput}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Account Holder Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Suresh Patil"
                      placeholderTextColor={CampusTheme.colors.textDim}
                      value={accountHolderInput}
                      onChangeText={setAccountHolderInput}
                    />
                  </View>
                </View>

                {/* BANK NAME */}
                <Text style={styles.inputLabel}>Bank Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. HDFC Bank"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={bankNameInput}
                  onChangeText={setBankNameInput}
                />

                {/* ACCOUNT NUMBERS */}
                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Account Number *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 50100492819283"
                      placeholderTextColor={CampusTheme.colors.textDim}
                      keyboardType="numeric"
                      value={accountNumberInput}
                      onChangeText={setAccountNumberInput}
                      secureTextEntry={!showAccountNumber}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Confirm Account No. *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Re-enter Account No."
                      placeholderTextColor={CampusTheme.colors.textDim}
                      keyboardType="numeric"
                      value={confirmAccNumberInput}
                      onChangeText={setConfirmAccNumberInput}
                    />
                  </View>
                </View>

                {/* IFSC & UPI ID */}
                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>IFSC Code *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. HDFC0001234"
                      placeholderTextColor={CampusTheme.colors.textDim}
                      autoCapitalize="characters"
                      value={ifscInput}
                      onChangeText={(t) => setIfscInput(t.toUpperCase())}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Merchant UPI VPA *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="name@okhdfcbank"
                      placeholderTextColor={CampusTheme.colors.textDim}
                      autoCapitalize="none"
                      value={upiVpaInput}
                      onChangeText={setUpiVpaInput}
                    />
                  </View>
                </View>

                {/* GATEWAY ENGINE SELECTOR */}
                <Text style={styles.inputLabel}>Gateway Engine / Settlement Mode</Text>
                <View style={styles.providerToggleRow}>
                  {[
                    { key: 'UPI_DIRECT', label: 'Direct Dynamic UPI (0% Fee · Instant)' },
                    { key: 'RAZORPAY_ROUTE', label: 'Razorpay Route (Marketplace)' },
                    { key: 'CASHFREE_SPLIT', label: 'Cashfree Split' },
                  ].map((opt) => (
                    <Pressable
                      key={opt.key}
                      style={[
                        styles.providerChip,
                        gatewayProviderInput === opt.key && styles.providerChipActive,
                      ]}
                      onPress={() => setGatewayProviderInput(opt.key as any)}
                    >
                      <Text
                        style={[
                          styles.providerChipText,
                          gatewayProviderInput === opt.key && styles.providerChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* PENNY DROP SIMULATION NOTICE */}
                <View style={styles.pennyNoticeBox}>
                  <Ionicons name="shield-checkmark" size={16} color="#34D399" />
                  <Text style={styles.pennyNoticeText}>
                    Automated Penny-Drop (₹1 credit) verification runs automatically to verify
                    account validity. Zero downtime for students ordering.
                  </Text>
                </View>
              </ScrollView>

              <Pressable
                style={[styles.saveDishBtn, savingBank && { opacity: 0.7 }]}
                onPress={handleSaveBankDetails}
                disabled={savingBank}
              >
                {savingBank ? (
                  <ActivityIndicator color="#0D1411" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#0D1411" />
                    <Text style={styles.saveDishBtnText}>Verify & Save Destination Bank</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* COUNTER QR STANDEE MODAL */}
      {showStandeeModal && (
        <Modal
          visible={showStandeeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStandeeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxWidth: 420, alignItems: 'center' }]}>
              <View style={[styles.modalTop, { width: '100%' }]}>
                <View>
                  <Text style={styles.modalHeading}>Counter QR Standee</Text>
                  <Text style={styles.bankHeaderSub}>Display or print for your billing counter</Text>
                </View>
                <Pressable onPress={() => setShowStandeeModal(false)}>
                  <Ionicons name="close-circle" size={24} color={CampusTheme.colors.textMuted} />
                </Pressable>
              </View>

              {/* PRINTABLE STANDEE SHEET */}
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 20,
                  width: '100%',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: CampusTheme.colors.primary,
                  marginVertical: 10,
                }}
              >
                {/* STANDEE HEADER */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <Ionicons name="school" size={20} color="#064E3B" />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: '#064E3B',
                      letterSpacing: 0.5,
                    }}
                  >
                    {college?.shortName || "JSPM's Campus"}
                  </Text>
                </View>

                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: '900',
                    color: '#111827',
                    textAlign: 'center',
                  }}
                >
                  {payoutConfig?.businessName || 'Central Food Court'}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: '#6B7280',
                    fontWeight: '600',
                    marginBottom: 12,
                  }}
                >
                  Official Direct UPI Counter Payment
                </Text>

                {/* BIG QR CODE */}
                <View
                  style={{
                    padding: 10,
                    backgroundColor: '#F9FAFB',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                >
                  <Image
                    source={{
                      uri: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                        `upi://pay?pa=${
                          payoutConfig?.upiVpa || 'suresh.canteen@okhdfcbank'
                        }&pn=${encodeURIComponent(
                          payoutConfig?.businessName || 'JSPM Food Court'
                        )}&cu=INR`
                      )}`,
                    }}
                    style={{ width: 200, height: 200, borderRadius: 6 }}
                    resizeMode="contain"
                  />
                </View>

                {/* VPA & BANK BADGE */}
                <View style={{ marginTop: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#059669' }}>
                    UPI ID: {payoutConfig?.upiVpa || 'suresh.canteen@okhdfcbank'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#4B5563', marginTop: 2 }}>
                    Destination: {payoutConfig?.bankName || 'HDFC Bank'} (A/C: ••••
                    {payoutConfig?.accountNumber
                      ? payoutConfig.accountNumber.slice(-4)
                      : '9283'}
                    )
                  </Text>
                </View>

                {/* ACCEPTED APPS LOGO FOOTER */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: 14,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: '#E5E7EB',
                    width: '100%',
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#9CA3AF' }}>
                    ACCEPTED HERE:
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#374151' }}>
                    GPay • PhonePe • Paytm • BHIM
                  </Text>
                </View>
              </View>

              {/* PRINT BUTTON */}
              <Pressable
                style={[styles.saveDishBtn, { width: '100%', marginTop: 8 }]}
                onPress={() => {
                  if (typeof window !== 'undefined' && window.print) {
                    window.print();
                  } else {
                    alert(
                      'Take a screenshot or print this QR standee to display on your food court counter!'
                    );
                  }
                }}
              >
                <Ionicons name="print-outline" size={18} color="#0D1411" />
                <Text style={styles.saveDishBtnText}>Print Counter Standee</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: CampusTheme.colors.background,
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as any } : {}),
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#0E1713',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(142, 228, 175, 0.12)',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: CampusTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    letterSpacing: 0.5,
  },
  navSub: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    marginTop: 1,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  switchPortalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#162820',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
  },
  switchPortalText: {
    color: CampusTheme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  logoutBtn: {
    padding: 6,
  },
  tabsContainer: {
    backgroundColor: '#0F1A14',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  queueTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#162820',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.1)',
  },
  activeQueueTab: {
    backgroundColor: CampusTheme.colors.primary,
    borderColor: CampusTheme.colors.primary,
  },
  queueTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: CampusTheme.colors.textMuted,
  },
  activeQueueTabText: {
    color: CampusTheme.colors.background,
    fontWeight: '800',
  },
  tabCountBadge: {
    backgroundColor: '#1E3528',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeTabCountBadge: {
    backgroundColor: '#0D1411',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
  },
  activeTabCountText: {
    color: CampusTheme.colors.primary,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  emptyQueue: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: CampusTheme.colors.textMuted,
    marginTop: 4,
  },
  orderCard: {
    backgroundColor: '#15251E',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
    ...CampusTheme.shadows.card,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNum: {
    fontSize: 18,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  studentInfo: {
    fontSize: 13,
    color: CampusTheme.colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  paymentStatusBadge: {
    backgroundColor: '#1E3528',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A3D9BE',
  },
  itemsList: {
    backgroundColor: '#0E1812',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemQty: {
    fontSize: 13,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
    width: 26,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    color: CampusTheme.colors.text,
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 13,
    color: CampusTheme.colors.textMuted,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: CampusTheme.colors.textMuted,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  orderActions: {
    gap: 8,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CampusTheme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  actionBtnPrimaryText: {
    color: CampusTheme.colors.background,
    fontSize: 13,
    fontWeight: '800',
  },
  actionBtnReady: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#34D399',
    borderRadius: 12,
    paddingVertical: 12,
  },
  actionBtnReadyText: {
    color: CampusTheme.colors.background,
    fontSize: 13,
    fontWeight: '800',
  },
  readyActions: {
    gap: 8,
  },
  cashConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FBBF24',
    borderRadius: 12,
    paddingVertical: 10,
  },
  cashConfirmText: {
    color: '#0D1411',
    fontSize: 12,
    fontWeight: '800',
  },
  actionBtnOtp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CampusTheme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  actionBtnOtpText: {
    color: CampusTheme.colors.background,
    fontSize: 13,
    fontWeight: '800',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  completedText: {
    fontSize: 12,
    color: CampusTheme.colors.primary,
    fontWeight: '600',
  },
  otpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  otpModalCard: {
    backgroundColor: '#14231B',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: CampusTheme.colors.cardBorder,
  },
  otpModalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  otpIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CampusTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    marginBottom: 6,
  },
  otpModalSubtitle: {
    fontSize: 13,
    color: CampusTheme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 20,
  },
  otpInput: {
    backgroundColor: '#0E1712',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: CampusTheme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 16,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: CampusTheme.colors.primary,
  },
  feedbackError: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderWidth: 1,
    borderColor: CampusTheme.colors.danger,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  feedbackSuccessText: {
    color: CampusTheme.colors.primary,
  },
  feedbackErrorText: {
    color: CampusTheme.colors.danger,
  },
  otpModalButtons: {
    gap: 10,
  },
  verifyOtpBtn: {
    backgroundColor: CampusTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  verifyOtpBtnText: {
    color: CampusTheme.colors.background,
    fontSize: 14,
    fontWeight: '800',
  },
  cancelOtpBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelOtpBtnText: {
    color: CampusTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },

  // MODE SWITCHER BAR
  modeBar: {
    flexDirection: 'row',
    backgroundColor: '#0E1713',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#15251E',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.18)',
  },
  activeModeBtn: {
    backgroundColor: CampusTheme.colors.primary,
    borderColor: CampusTheme.colors.primary,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: CampusTheme.colors.primary,
  },
  activeModeBtnText: {
    color: '#0D1411',
  },

  // MENU CATALOG HEADER
  menuHeaderCard: {
    backgroundColor: '#121F18',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuHeaderLeft: {
    flex: 1,
    minWidth: 200,
  },
  menuHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    marginBottom: 4,
  },
  menuHeaderSub: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    lineHeight: 17,
    marginBottom: 12,
  },
  menuMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  menuMetricBadge: {
    backgroundColor: '#1A2E24',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  menuMetricBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: CampusTheme.colors.text,
  },
  inStockMetricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  inStockMetricText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
  },
  soldOutMetricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  soldOutMetricText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F87171',
  },
  addDishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CampusTheme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addDishBtnText: {
    color: '#0D1411',
    fontWeight: '800',
    fontSize: 13,
  },

  // SEARCH & CATEGORY BAR
  menuSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121F18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 12,
  },
  menuSearchInput: {
    flex: 1,
    fontSize: 14,
    color: CampusTheme.colors.text,
  },
  categoryPillsScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#13211A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  activeCategoryPill: {
    backgroundColor: CampusTheme.colors.primary,
    borderColor: CampusTheme.colors.primary,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: CampusTheme.colors.textMuted,
  },
  activeCategoryPillText: {
    color: '#0D1411',
    fontWeight: '700',
  },

  // FOOD ITEMS CARDS
  foodItemList: {
    gap: 14,
    paddingBottom: 20,
  },
  dishCard: {
    backgroundColor: '#121E19',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.12)',
  },
  dishCardSoldOut: {
    opacity: 0.65,
    borderColor: 'rgba(248, 113, 113, 0.25)',
  },
  dishTopRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  dishThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#1A2A22',
  },
  dishThumbPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#1A2A22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishInfo: {
    flex: 1,
  },
  dishTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  vegBadge: {
    width: 15,
    height: 15,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegBadgeVeg: {
    borderColor: '#34D399',
  },
  vegBadgeNonVeg: {
    borderColor: '#F87171',
  },
  vegDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  vegDotVeg: {
    backgroundColor: '#34D399',
  },
  vegDotNonVeg: {
    backgroundColor: '#F87171',
  },
  dishName: {
    fontSize: 16,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    flex: 1,
  },
  dishCategoryMeta: {
    fontSize: 11,
    color: CampusTheme.colors.textDim,
    marginBottom: 4,
  },
  dishDesc: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    lineHeight: 16,
    marginBottom: 6,
  },
  dishPriceText: {
    fontSize: 16,
    fontWeight: '900',
    color: CampusTheme.colors.primary,
  },

  // DISH CONTROLS
  dishControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  stockToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  stockToggleInStock: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  stockToggleSoldOut: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  stockToggleBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stockInText: {
    color: '#34D399',
  },
  stockOutText: {
    color: '#F87171',
  },
  dishActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dishEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#192C23',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
  },
  dishEditBtnText: {
    color: CampusTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  dishDeleteBtn: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    padding: 7,
    borderRadius: 8,
  },

  // MODAL STYLES FOR DISH ADD/EDIT
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#121F18',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
    padding: 22,
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: CampusTheme.colors.textMuted,
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#0A120E',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: CampusTheme.colors.text,
    fontSize: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  presetScroll: {
    gap: 8,
    paddingBottom: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1A2C23',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
  },
  presetChipText: {
    color: CampusTheme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  catSelectScroll: {
    gap: 8,
    paddingBottom: 8,
  },
  catSelectChip: {
    backgroundColor: '#0A120E',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  catSelectChipActive: {
    backgroundColor: CampusTheme.colors.primary,
    borderColor: CampusTheme.colors.primary,
  },
  catSelectChipText: {
    color: CampusTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  catSelectChipTextActive: {
    color: '#0D1411',
    fontWeight: '800',
  },
  vegToggleRow: {
    marginTop: 8,
  },
  vegToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0A120E',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignSelf: 'flex-start',
  },
  vegToggleBtnActive: {
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  vegToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: CampusTheme.colors.text,
  },
  saveDishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CampusTheme.colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 18,
  },
  saveDishBtnText: {
    color: '#0D1411',
    fontSize: 14,
    fontWeight: '800',
  },

  // BANK & PAYOUT STYLES
  bankHeaderCard: {
    backgroundColor: '#121F18',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.18)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  bankHeaderLeft: {
    flex: 1,
    minWidth: 240,
  },
  bankHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  bankHeaderSub: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    marginTop: 3,
    lineHeight: 18,
  },
  updateBankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CampusTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  updateBankBtnText: {
    color: '#0D1411',
    fontWeight: '800',
    fontSize: 13,
  },
  bankToastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  bankToastText: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  bankHeroCard: {
    backgroundColor: '#15251E',
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.25)',
    ...CampusTheme.shadows.card,
  },
  bankHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  bankLogoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E3528',
    borderWidth: 1,
    borderColor: CampusTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankHeroName: {
    fontSize: 17,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  bankHeroType: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 211, 153, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  verifiedPillText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '800',
  },
  bankDetailsGrid: {
    backgroundColor: '#0D1712',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  bankDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: CampusTheme.colors.textMuted,
  },
  bankDetailVal: {
    fontSize: 13,
    fontWeight: '700',
    color: CampusTheme.colors.text,
  },
  accountNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
    letterSpacing: 1,
  },
  revealBtn: {
    padding: 4,
  },
  bankVpaHighlight: {
    color: CampusTheme.colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  bankHeroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  changeBankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E3528',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.3)',
  },
  changeBankBtnText: {
    color: CampusTheme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  syncMetaText: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    fontWeight: '600',
  },
  payoutMetricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  payoutMetricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#121F18',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.12)',
  },
  payoutMetricLabel: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    fontWeight: '700',
    marginBottom: 6,
  },
  payoutMetricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  payoutMetricSub: {
    fontSize: 10,
    color: CampusTheme.colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  guideCard: {
    backgroundColor: '#121F18',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  guideOptionBox: {
    backgroundColor: '#0A120E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  guideOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  guideOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  guideOptionBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  guideOptionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
  },
  guideOptionText: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    lineHeight: 18,
  },
  stepsList: {
    gap: 8,
    marginTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1E3528',
    color: CampusTheme.colors.primary,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 11,
    fontWeight: '800',
  },
  stepText: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },
  settlementLogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A120E',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  settlementLogLeft: {
    gap: 2,
  },
  settlementOrderNum: {
    fontSize: 13,
    fontWeight: '700',
    color: CampusTheme.colors.text,
  },
  settlementUtr: {
    fontSize: 11,
    color: CampusTheme.colors.textDim,
  },
  settlementLogRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  settlementAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#34D399',
  },
  settlementStatusBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: CampusTheme.colors.primary,
  },
  bankPresetScroll: {
    gap: 8,
    paddingBottom: 6,
  },
  bankPresetChip: {
    backgroundColor: '#1A2C23',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
  },
  bankPresetChipActive: {
    backgroundColor: CampusTheme.colors.primary,
    borderColor: CampusTheme.colors.primary,
  },
  bankPresetChipText: {
    color: CampusTheme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  bankPresetChipTextActive: {
    color: '#0D1411',
    fontWeight: '800',
  },
  providerToggleRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  providerChip: {
    backgroundColor: '#0A120E',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  providerChipActive: {
    backgroundColor: '#1E3528',
    borderColor: CampusTheme.colors.primary,
  },
  providerChipText: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    fontWeight: '700',
  },
  providerChipTextActive: {
    color: CampusTheme.colors.primary,
    fontWeight: '800',
  },
  pennyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(142, 228, 175, 0.08)',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
  },
  pennyNoticeText: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
});

