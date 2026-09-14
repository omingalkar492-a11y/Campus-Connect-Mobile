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
  Linking,
  Platform,
  Image,
} from 'react-native';

import { CampusTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/context/theme-context';
import { DataService } from '@/services/data-service';
import { PaymentService } from '@/services/payment-service';
import { SoundService } from '@/services/sound-service';
import { FoodItem, Order, PaymentMethod, FoodCourtPayoutConfig, OrderStatus } from '@/types';

export default function CanteenScreen() {
  const router = useRouter();
  const { college, profile } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('UPI');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // UPI Gateway State
  const [payoutConfig, setPayoutConfig] = useState<FoodCourtPayoutConfig | null>(null);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiOrderId, setUpiOrderId] = useState<string>('');
  const [upiAmount, setUpiAmount] = useState<number>(0);
  const [upiUriString, setUpiUriString] = useState<string>('');
  const [upiRefInput, setUpiRefInput] = useState<string>('');
  const [upiVerifying, setUpiVerifying] = useState(false);
  const [upiFeedback, setUpiFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Order History State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const prevOrderStatusesRef = React.useRef<Record<string, OrderStatus>>({});
  const isInitialStudentLoadRef = React.useRef<boolean>(true);

  const categories = ['All', 'Popular', 'Quick Bites', 'Drinks', 'Meals'];

  const loadMenuAndHistory = async () => {
    const activeCollegeId = college?.id || 'col_jspm_tathawade';
    const activeStudentUid = profile?.uid || 'demo_student_aarav';
    try {
      const [items, ords, config] = await Promise.all([
        DataService.getFoodItems(activeCollegeId, activeCategory),
        DataService.getOrders(activeCollegeId, activeStudentUid),
        DataService.getPayoutConfig('fc_jspm_main'),
      ]);

      // Trigger order ready chime when food is ready for student pickup
      if (isInitialStudentLoadRef.current) {
        ords.forEach((o) => {
          prevOrderStatusesRef.current[o.id] = o.orderStatus;
        });
        isInitialStudentLoadRef.current = false;
      } else {
        const newlyReadyOrders = ords.filter((o) => {
          const prevStatus = prevOrderStatusesRef.current[o.id];
          return o.orderStatus === 'ready' && prevStatus && prevStatus !== 'ready';
        });

        if (newlyReadyOrders.length > 0) {
          SoundService.playOrderReadyChime();
        }

        ords.forEach((o) => {
          prevOrderStatusesRef.current[o.id] = o.orderStatus;
        });
      }

      setFoodItems(items);
      setMyOrders(ords);
      setPayoutConfig(config);
    } catch (e) {
      console.error('Error loading food menu:', e);
    }
  };

  useEffect(() => {
    loadMenuAndHistory();
    const interval = setInterval(loadMenuAndHistory, 3000);
    let handleStorage: any;
    if (typeof window !== 'undefined') {
      handleStorage = (e: StorageEvent) => {
        if (e.key === 'cc_orders') {
          loadMenuAndHistory();
        }
      };
      window.addEventListener('storage', handleStorage);
    }
    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined' && handleStorage) {
        window.removeEventListener('storage', handleStorage);
      }
    };
  }, [college, activeCategory, profile]);

  const activeOrders = myOrders.filter((o) => o.orderStatus !== 'completed');

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'placed':
        return '🕒 Order Placed';
      case 'accepted':
        return '👨‍🍳 Accepted';
      case 'preparing':
        return '🔥 Preparing';
      case 'ready':
        return '🔔 Ready for Pickup!';
      default:
        return status.toUpperCase();
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'ready':
        return '#34D399';
      case 'preparing':
        return '#F59E0B';
      case 'accepted':
        return '#3B82F6';
      default:
        return '#10B981';
    }
  };

  const addToCart = (itemId: string) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[itemId] > 1) {
        updated[itemId] -= 1;
      } else {
        delete updated[itemId];
      }
      return updated;
    });
  };

  const cartTotalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const cartSubtotal = Object.entries(cart).reduce((sum, [itemId, qty]) => {
    const item = foodItems.find((i) => i.id === itemId);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const handlePlaceOrder = async () => {
    if (cartTotalItems === 0 || !college || !profile) return;

    try {
      setSubmittingOrder(true);
      const itemsToOrder = Object.entries(cart).map(([itemId, quantity]) => ({
        itemId,
        quantity,
      }));

      const studentIdentifier = `${profile.rollNumber ? `Roll: ${profile.rollNumber}` : '3104'} · ${
        profile.division || 'Div A'
      }${profile.department ? ` · ${profile.department}` : ''}`;

      const newOrder = await DataService.createOrder({
        collegeId: college.id,
        foodCourtId: 'fc_jspm_main',
        studentUid: profile.uid,
        studentName: profile.name || 'Student Customer',
        studentIdentifier,
        items: itemsToOrder,
        paymentMethod: selectedPaymentMethod,
      });

      if (selectedPaymentMethod === 'UPI') {
        // Trigger UPI flow with dynamic payout recipient
        const upiResult = await PaymentService.initiateUpiPayment({
          orderId: newOrder.id,
          collegeId: college.id,
          studentUid: profile.uid,
          amount: newOrder.total,
          payeeVpa: payoutConfig?.upiVpa,
          payeeName: payoutConfig?.businessName,
          foodCourtId: newOrder.foodCourtId,
        });

        setUpiOrderId(newOrder.id);
        setUpiAmount(newOrder.total);
        setUpiUriString(upiResult.upiUri);
        setUpiRefInput(`UPI${Math.floor(100000000000 + Math.random() * 900000000000)}`);
        setCart({});
        setCartModalVisible(false);
        setShowUpiModal(true);
        setConfirmedOrder(newOrder);
      } else {
        // Cash order placed
        await PaymentService.initiateCashPayment(newOrder.id, college.id, profile.uid, newOrder.total);
        setConfirmedOrder(newOrder);
        setCart({});
        setCartModalVisible(false);
      }

      await loadMenuAndHistory();
    } catch (err: any) {
      alert(err?.message || 'Failed to place order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Student switches active cash order to Online UPI Payment anytime
  const handleOpenOnlinePaymentForOrder = async (order: Order) => {
    try {
      const upiResult = await PaymentService.initiateUpiPayment({
        orderId: order.id,
        collegeId: order.collegeId,
        studentUid: profile?.uid || order.studentUid,
        amount: order.total,
        payeeVpa: payoutConfig?.upiVpa,
        payeeName: payoutConfig?.businessName,
        foodCourtId: order.foodCourtId,
      });

      setUpiOrderId(order.id);
      setUpiAmount(order.total);
      setUpiUriString(upiResult.upiUri);
      setUpiRefInput(`UPI${Math.floor(100000000000 + Math.random() * 900000000000)}`);
      setShowUpiModal(true);
    } catch (e: any) {
      alert(e.message || 'Could not initiate online payment');
    }
  };

  const handleVerifyUpi = async () => {
    if (!upiOrderId || !upiRefInput.trim()) return;
    try {
      setUpiVerifying(true);
      setUpiFeedback(null);
      const res = await PaymentService.verifyUpiPayment(upiOrderId, upiRefInput.trim());
      setUpiFeedback(res);
      if (res.success) {
        setTimeout(() => {
          setShowUpiModal(false);
          setUpiFeedback(null);
        }, 1200);
      }
      await loadMenuAndHistory();
    } catch (e: any) {
      setUpiFeedback({ success: false, message: e.message || 'Verification failed' });
    } finally {
      setUpiVerifying(false);
    }
  };

  const getItemIcon = (cat: string, name: string) => {
    if (cat === 'Drinks' || name.toLowerCase().includes('coffee') || name.toLowerCase().includes('tea') || name.toLowerCase().includes('chai')) {
      return 'cafe';
    }
    if (cat === 'Meals' || name.toLowerCase().includes('thali') || name.toLowerCase().includes('dosa')) {
      return 'restaurant';
    }
    return 'fast-food';
  };

  return (
    <View style={[styles.safeContainer, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.brandSubtitle, { color: colors.primary }]}>CAMPUS CONNECT CANTEEN</Text>
            <Text style={[styles.screenHeading, { color: colors.text }]}>Today’s menu</Text>
            <View style={styles.ownerHeaderBadge}>
              <Ionicons name="restaurant-outline" size={13} color={colors.primary} />
              <Text style={[styles.ownerHeaderBadgeText, { color: colors.textMuted }]}>
                {payoutConfig?.businessName || 'JSPM Food Court'} • Owner:{' '}
                <Text style={{ color: colors.primary, fontWeight: '800' }}>
                  {payoutConfig?.accountHolderName || 'Suresh Patil'}
                </Text>
              </Text>
            </View>
          </View>
          <View style={styles.headerRightActions}>
            {cartTotalItems > 0 && (
              <Pressable
                style={styles.headerCartBtn}
                onPress={() => setCartModalVisible(true)}
              >
                <Ionicons name="cart" size={15} color="#0D1411" />
                <Text style={styles.headerCartBtnText}>
                  {cartTotalItems} · ₹{cartSubtotal}
                </Text>
              </Pressable>
            )}
            <Pressable
              style={[
                styles.historyBtn,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
              onPress={() => setShowHistoryModal(true)}
            >
              <Ionicons name="receipt-outline" size={16} color={colors.primary} />
              <Text style={[styles.historyBtnText, { color: colors.primary }]}>Orders</Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.screenSub, { color: colors.textMuted }]}>
          Order fresh food ahead, avoid queues, and pick up easily with your 4-digit code.
        </Text>

        {/* ACTIVE ORDER LIVE TRACKER BANNER (START TO END) */}
        {activeOrders.length > 0 && (
          <View style={styles.activeOrderBanner}>
            <View style={styles.activeOrderHeader}>
              <View style={styles.activeOrderHeaderLeft}>
                <View style={styles.activeOrderPulse} />
                <Text style={styles.activeOrderHeading}>LIVE ORDER IN PROGRESS</Text>
              </View>
              <View
                style={[
                  styles.activeStatusPill,
                  { backgroundColor: getStatusColor(activeOrders[0].orderStatus) },
                ]}
              >
                <Text style={styles.activeStatusPillText}>
                  {getStatusLabel(activeOrders[0].orderStatus)}
                </Text>
              </View>
            </View>

            <View style={styles.activeOrderBody}>
              <View style={styles.activeOrderMainRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.activeOrderNumber}>{activeOrders[0].orderNumber}</Text>
                  <Text style={styles.activeOrderOwnerText}>
                    {payoutConfig?.businessName || 'JSPM Canteen'} • Owner:{' '}
                    <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                      {payoutConfig?.accountHolderName || 'Suresh Patil'}
                    </Text>
                  </Text>
                  <Text style={styles.activeOrderItemsSummary} numberOfLines={1}>
                    {activeOrders[0].items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                  </Text>
                </View>

                <View style={styles.activeOtpCard}>
                  <Text style={styles.activeOtpLabel}>PICKUP OTP</Text>
                  <Text style={styles.activeOtpCode}>{activeOrders[0].pickupOtp}</Text>
                </View>
              </View>

              {/* PAYMENT STATUS & ONLINE PAYMENT OPTION FROM START TO END */}
              <View style={styles.activePaymentRow}>
                <View style={styles.activePaymentInfo}>
                  <Text style={styles.activePaymentTotal}>Total: ₹{activeOrders[0].total}</Text>
                  <Text style={styles.activePaymentMethodText}>
                    {activeOrders[0].paymentMethod === 'UPI' &&
                    activeOrders[0].paymentStatus === 'paid'
                      ? '✅ Paid via Online UPI'
                      : '💵 Cash at Counter (OTP optional)'}
                  </Text>
                </View>

                {activeOrders[0].paymentStatus === 'cash_pending' && (
                  <Pressable
                    style={styles.switchUpiBtn}
                    onPress={() => handleOpenOnlinePaymentForOrder(activeOrders[0])}
                  >
                    <Ionicons name="flash" size={13} color="#0D1411" />
                    <Text style={styles.switchUpiBtnText}>Pay Online via UPI</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}

        {/* CATEGORY PILLS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
          style={styles.categoryScrollView}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <Pressable
                key={cat}
                style={[
                  styles.categoryPill,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    { color: colors.textMuted },
                    isActive && { color: isDark ? '#0B110E' : '#FFFFFF', fontWeight: '800' },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* MENU LIST */}
        <View style={styles.menuList}>
          {foodItems.map((item) => {
            const qtyInCart = cart[item.id] || 0;
            return (
              <View
                key={item.id}
                style={[styles.foodCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <View style={[styles.foodIconBox, { backgroundColor: colors.primaryDim }]}>
                  <Ionicons
                    name={getItemIcon(item.category, item.name)}
                    size={28}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.foodInfo}>
                  <View style={[styles.prepBadge, { backgroundColor: colors.primaryDim }]}>
                    <Text style={[styles.prepBadgeText, { color: colors.primary }]}>{item.prepTimeMinutes} min</Text>
                  </View>

                  <Text style={[styles.foodName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.foodDesc, { color: colors.textMuted }]} numberOfLines={2}>
                    {item.description}
                  </Text>

                  <View style={styles.foodBottomRow}>
                    <Text style={[styles.foodPrice, { color: colors.text }]}>₹{item.price}</Text>

                    {qtyInCart > 0 ? (
                      <View style={[styles.stepperBox, { backgroundColor: colors.primary }]}>
                        <Pressable
                          style={styles.stepperBtn}
                          onPress={() => removeFromCart(item.id)}
                        >
                          <Ionicons name="remove" size={14} color={isDark ? '#0B110E' : '#FFFFFF'} />
                        </Pressable>
                        <Text style={[styles.stepperQty, { color: isDark ? '#0B110E' : '#FFFFFF' }]}>{qtyInCart}</Text>
                        <Pressable
                          style={styles.stepperBtn}
                          onPress={() => addToCart(item.id)}
                        >
                          <Ionicons name="add" size={14} color={isDark ? '#0B110E' : '#FFFFFF'} />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={[styles.addBtn, { backgroundColor: colors.primary }]}
                        onPress={() => addToCart(item.id)}
                      >
                        <Text style={[styles.addBtnText, { color: isDark ? '#0B110E' : '#FFFFFF' }]}>+ Add</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* FLOATING CART BAR */}
      {cartTotalItems > 0 && (
        <View style={styles.floatingCartContainer}>
          <Pressable
            style={styles.floatingCartBar}
            onPress={() => setCartModalVisible(true)}
          >
            <View style={styles.cartBarLeft}>
              <View style={styles.cartCountCircle}>
                <Text style={styles.cartCountText}>{cartTotalItems}</Text>
              </View>
              <Text style={styles.cartBarSummary}>
                {cartTotalItems} item{cartTotalItems > 1 ? 's' : ''} · ₹{cartSubtotal}
              </Text>
            </View>

            <View style={styles.cartBarRight}>
              <Text style={styles.viewCartText}>View Cart</Text>
              <Ionicons name="arrow-forward" size={16} color={CampusTheme.colors.background} />
            </View>
          </Pressable>
        </View>
      )}

      {/* CART & CHECKOUT MODAL */}
      <Modal
        visible={cartModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCartModalVisible(false)}
      >
        <View style={styles.cartModalContainer}>
          <View style={styles.cartModalHeader}>
            <View>
              <Text style={styles.cartModalTitle}>Your Order</Text>
              <Text style={styles.cartModalSub}>
                {payoutConfig?.businessName || 'JSPM Food Court'} • Owner:{' '}
                {payoutConfig?.accountHolderName || 'Suresh Patil'}
              </Text>
            </View>
            <Pressable
              style={styles.closeCartBtn}
              onPress={() => setCartModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={CampusTheme.colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.cartItemsScroll}>
            {Object.entries(cart).map(([itemId, qty]) => {
              const item = foodItems.find((i) => i.id === itemId);
              if (!item) return null;
              return (
                <View key={itemId} style={styles.cartItemRow}>
                  <View style={styles.cartItemDetails}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemPrice}>
                      ₹{item.price} × {qty} = ₹{item.price * qty}
                    </Text>
                  </View>

                  <View style={styles.cartStepper}>
                    <Pressable
                      style={styles.cartStepperBtn}
                      onPress={() => removeFromCart(itemId)}
                    >
                      <Ionicons name="remove" size={14} color={CampusTheme.colors.text} />
                    </Pressable>
                    <Text style={styles.cartStepperCount}>{qty}</Text>
                    <Pressable
                      style={styles.cartStepperBtn}
                      onPress={() => addToCart(itemId)}
                    >
                      <Ionicons name="add" size={14} color={CampusTheme.colors.text} />
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {/* PAYMENT METHOD SELECTOR */}
            <View style={styles.paymentSection}>
              <Text style={styles.paymentSectionTitle}>Select Payment Method</Text>

              <View style={styles.paymentOptionsRow}>
                <Pressable
                  style={[
                    styles.paymentOptionCard,
                    selectedPaymentMethod === 'UPI' && styles.activePaymentOption,
                  ]}
                  onPress={() => setSelectedPaymentMethod('UPI')}
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={24}
                    color={
                      selectedPaymentMethod === 'UPI'
                        ? CampusTheme.colors.primary
                        : CampusTheme.colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.paymentOptionName,
                      selectedPaymentMethod === 'UPI' && styles.activePaymentText,
                    ]}
                  >
                    UPI Instant
                  </Text>
                  <Text style={styles.paymentOptionDesc}>Verified UPI Gateway</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.paymentOptionCard,
                    selectedPaymentMethod === 'CASH' && styles.activePaymentOption,
                  ]}
                  onPress={() => setSelectedPaymentMethod('CASH')}
                >
                  <Ionicons
                    name="cash-outline"
                    size={24}
                    color={
                      selectedPaymentMethod === 'CASH'
                        ? CampusTheme.colors.primary
                        : CampusTheme.colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.paymentOptionName,
                      selectedPaymentMethod === 'CASH' && styles.activePaymentText,
                    ]}
                  >
                    Cash At Pickup
                  </Text>
                  <Text style={styles.paymentOptionDesc}>Pay cash at counter • OTP optional</Text>
                </Pressable>
              </View>

              <View style={styles.billBreakdown}>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Item Subtotal</Text>
                  <Text style={styles.billValue}>₹{cartSubtotal}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Convenience & Tax</Text>
                  <Text style={styles.billValue}>₹0</Text>
                </View>
                <View style={[styles.billRow, styles.billRowTotal]}>
                  <Text style={styles.billTotalLabel}>Total to Pay</Text>
                  <Text style={styles.billTotalValue}>₹{cartSubtotal}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* CHECKOUT BUTTON */}
          <View style={styles.checkoutFooter}>
            <Pressable
              style={[styles.checkoutBtn, submittingOrder && { opacity: 0.7 }]}
              onPress={handlePlaceOrder}
              disabled={submittingOrder}
            >
              {submittingOrder ? (
                <ActivityIndicator color={CampusTheme.colors.background} />
              ) : (
                <Text style={styles.checkoutBtnText}>
                  Place Order • ₹{cartSubtotal}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* VERIFIED UPI GATEWAY MODAL */}
      {showUpiModal && (
        <Modal
          visible={showUpiModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUpiModal(false)}
        >
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.upiIconHeader}>
                <Ionicons name="qr-code" size={36} color={CampusTheme.colors.primary} />
              </View>

              <Text style={styles.confirmTitle}>UPI Payment Verification</Text>
              <Text style={styles.upiAmountText}>Amount: ₹{upiAmount}</Text>

              {/* DYNAMIC FOOD COURT BANK & VPA CARD */}
              <View
                style={{
                  backgroundColor: '#162820',
                  borderRadius: 14,
                  padding: 12,
                  width: '100%',
                  marginVertical: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(142, 228, 175, 0.25)',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: CampusTheme.colors.text,
                    }}
                  >
                    {payoutConfig?.businessName || 'JSPM Central Food Court'}
                  </Text>
                  <View
                    style={{
                      backgroundColor: 'rgba(52, 211, 153, 0.2)',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#34D399' }}>
                      DIRECT BANK DEPOSIT
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 11, color: CampusTheme.colors.textMuted }}>
                  Receiving Bank:{' '}
                  <Text style={{ color: CampusTheme.colors.text, fontWeight: '700' }}>
                    {payoutConfig?.bankName || 'HDFC Bank'}
                  </Text>{' '}
                  (A/C ending ••••
                  {payoutConfig?.accountNumber
                    ? payoutConfig.accountNumber.slice(-4)
                    : '9283'}
                  )
                </Text>

                <Text style={{ fontSize: 11, color: CampusTheme.colors.textMuted, marginTop: 3 }}>
                  Payee UPI ID:{' '}
                  <Text style={{ color: CampusTheme.colors.primary, fontWeight: '700' }}>
                    {payoutConfig?.upiVpa || 'campusconnect.canteen@okhdfcbank'}
                  </Text>
                </Text>
              </View>

              {/* LIVE SCANNABLE DYNAMIC UPI QR CODE */}
              <View style={{ alignItems: 'center', marginVertical: 8 }}>
                <View
                  style={{
                    padding: 8,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                  }}
                >
                  <Image
                    source={{
                      uri: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        upiUriString ||
                          `upi://pay?pa=${
                            payoutConfig?.upiVpa || 'suresh.canteen@okhdfcbank'
                          }&pn=${encodeURIComponent(
                            payoutConfig?.businessName || 'JSPM Food Court'
                          )}&am=${upiAmount}&cu=INR`
                      )}`,
                    }}
                    style={{ width: 150, height: 150, borderRadius: 6 }}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  style={{
                    fontSize: 10,
                    color: CampusTheme.colors.textMuted,
                    marginTop: 6,
                    fontWeight: '700',
                  }}
                >
                  SCAN WITH ANY UPI APP (GPAY · PHONEPE · PAYTM · BHIM)
                </Text>
              </View>

              {/* 1-CLICK PAY VIA UPI APP BUTTON */}
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: '#1E3528',
                  borderWidth: 1,
                  borderColor: CampusTheme.colors.primary,
                  paddingVertical: 9,
                  borderRadius: 10,
                  marginBottom: 10,
                  width: '100%',
                }}
                onPress={() => {
                  const uri =
                    upiUriString ||
                    `upi://pay?pa=${
                      payoutConfig?.upiVpa || 'suresh.canteen@okhdfcbank'
                    }&pn=${encodeURIComponent(
                      payoutConfig?.businessName || 'JSPM Food Court'
                    )}&am=${upiAmount}&cu=INR`;
                  Linking.openURL(uri).catch(() => {
                    alert('Could not launch UPI app. Please scan the QR code above.');
                  });
                }}
              >
                <Ionicons name="flash" size={15} color={CampusTheme.colors.primary} />
                <Text
                  style={{ color: CampusTheme.colors.primary, fontWeight: '800', fontSize: 12 }}
                >
                  Pay via GPay / PhonePe / Paytm App
                </Text>
              </Pressable>

              <View style={styles.upiRefInputBox}>
                <Text style={styles.upiRefLabel}>BANK UTR / REFERENCE ID</Text>
                <TextInput
                  style={styles.upiInput}
                  value={upiRefInput}
                  onChangeText={setUpiRefInput}
                  placeholder="Enter 12-digit UTR"
                  placeholderTextColor={CampusTheme.colors.textDim}
                />
              </View>

              {upiFeedback && (
                <View
                  style={[
                    styles.upiFeedback,
                    upiFeedback.success ? styles.upiSuccess : styles.upiError,
                  ]}
                >
                  <Text
                    style={[
                      styles.upiFeedbackText,
                      upiFeedback.success ? styles.upiSuccessText : styles.upiErrorText,
                    ]}
                  >
                    {upiFeedback.message}
                  </Text>
                </View>
              )}

              <Pressable
                style={[styles.verifyPayBtn, upiVerifying && { opacity: 0.7 }]}
                onPress={handleVerifyUpi}
                disabled={upiVerifying}
              >
                {upiVerifying ? (
                  <ActivityIndicator color={CampusTheme.colors.background} />
                ) : (
                  <Text style={styles.verifyPayBtnText}>Confirm & Verify Payment</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* CONFIRMED ORDER & OTP DIALOG */}
      {confirmedOrder && !showUpiModal && (
        <Modal
          visible={!!confirmedOrder}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmedOrder(null)}
        >
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmCheckCircle}>
                <Ionicons name="checkmark" size={32} color={CampusTheme.colors.background} />
              </View>

              <Text style={styles.confirmTitle}>Order Placed Successfully!</Text>
              <Text style={styles.confirmOrderNumber}>{confirmedOrder.orderNumber}</Text>

              <View style={styles.confirmOutletBox}>
                <Ionicons name="restaurant-outline" size={14} color={CampusTheme.colors.primary} />
                <Text style={styles.confirmOutletText}>
                  {payoutConfig?.businessName || 'JSPM Food Court'} • Owner:{' '}
                  <Text style={{ fontWeight: '800', color: CampusTheme.colors.primary }}>
                    {payoutConfig?.accountHolderName || 'Suresh Patil'}
                  </Text>
                </Text>
              </View>

              <Text style={styles.confirmDesc}>
                {confirmedOrder.paymentMethod === 'CASH'
                  ? `Your order is sent to the canteen! Pay ₹${confirmedOrder.total} cash at the counter to collect your food. (OTP is not mandatory for cash orders). You can also switch to online payment anytime.`
                  : `Your order is sent to the canteen! Show this 4-digit code at the counter when your food is ready:`}
              </Text>

              <View style={styles.confirmOtpBox}>
                <Text style={styles.confirmOtpLabel}>YOUR 4-DIGIT PICKUP OTP</Text>
                <Text style={styles.confirmOtpCode}>{confirmedOrder.pickupOtp}</Text>
              </View>

              <View
                style={[
                  styles.confirmPaymentPill,
                  confirmedOrder.paymentMethod === 'CASH'
                    ? styles.confirmPaymentCash
                    : styles.confirmPaymentUpi,
                ]}
              >
                <Text
                  style={[
                    styles.confirmPaymentPillText,
                    confirmedOrder.paymentMethod === 'CASH'
                      ? styles.confirmPaymentCashText
                      : styles.confirmPaymentUpiText,
                  ]}
                >
                  {confirmedOrder.paymentMethod === 'CASH'
                    ? `💵 Cash at Counter: ₹${confirmedOrder.total}`
                    : `✅ Paid Online via UPI: ₹${confirmedOrder.total}`}
                </Text>
              </View>

              <Pressable
                style={styles.doneBtn}
                onPress={() => {
                  setConfirmedOrder(null);
                }}
              >
                <Text style={styles.doneBtnText}>View & Track on Menu</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* ORDER HISTORY MODAL */}
      {showHistoryModal && (
        <Modal
          visible={showHistoryModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowHistoryModal(false)}
        >
          <View style={styles.cartModalContainer}>
            <View style={styles.cartModalHeader}>
              <View>
                <Text style={styles.cartModalTitle}>Order History</Text>
                <Text style={styles.cartModalSub}>Past Canteen Orders & Receipts</Text>
              </View>
              <Pressable
                style={styles.closeCartBtn}
                onPress={() => setShowHistoryModal(false)}
              >
                <Ionicons name="close" size={24} color={CampusTheme.colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.cartItemsScroll}>
              {myOrders.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Text style={{ color: CampusTheme.colors.textMuted }}>No previous orders found.</Text>
                </View>
              ) : (
                myOrders.map((ord) => (
                  <View key={ord.id} style={styles.historyCard}>
                    <View style={styles.historyTop}>
                      <Text style={styles.historyOrderNum}>{ord.orderNumber}</Text>
                      <View style={styles.historyStatusPill}>
                        <Text style={styles.historyStatusText}>{ord.orderStatus.toUpperCase()}</Text>
                      </View>
                    </View>

                    <Text style={styles.historyItemsText}>
                      {ord.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                    </Text>

                    <View style={styles.historyBottom}>
                      <Text style={styles.historyTotal}>Total: ₹{ord.total}</Text>
                      <Text style={styles.historyPayText}>
                        {ord.paymentMethod} • {ord.paymentStatus.toUpperCase()}
                      </Text>
                    </View>

                    {ord.pickupOtp && (
                      <View style={styles.historyOtpRow}>
                        <Text style={styles.historyOtpLabel}>Pickup OTP: </Text>
                        <Text style={styles.historyOtpValue}>{ord.pickupOtp}</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
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
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 210,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: CampusTheme.colors.primary,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    ...CampusTheme.shadows.glow,
  },
  headerCartBtnText: {
    color: '#0D1411',
    fontSize: 12,
    fontWeight: '800',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#162820',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
  },
  historyBtnText: {
    color: CampusTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  screenHeading: {
    fontSize: 34,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    letterSpacing: -0.5,
  },
  screenSub: {
    fontSize: 14,
    color: CampusTheme.colors.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  ownerHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: 'rgba(142, 228, 175, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  ownerHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryScrollView: {
    marginBottom: 24,
  },
  categoryScroll: {
    gap: 8,
    paddingRight: 10,
  },
  categoryPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: '#162820',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.1)',
  },
  activeCategoryPill: {
    backgroundColor: CampusTheme.colors.primary,
    borderColor: CampusTheme.colors.primary,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: CampusTheme.colors.textMuted,
  },
  activeCategoryPillText: {
    color: CampusTheme.colors.background,
    fontWeight: '800',
  },
  menuList: {
    gap: 16,
  },
  foodCard: {
    flexDirection: 'row',
    backgroundColor: '#15251E',
    borderRadius: 22,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
    ...CampusTheme.shadows.card,
  },
  foodIconBox: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#1C3328',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodInfo: {
    flex: 1,
  },
  prepBadge: {
    backgroundColor: '#1C3528',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  prepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A3D9BE',
  },
  foodName: {
    fontSize: 17,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    marginBottom: 4,
  },
  foodDesc: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  foodBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  addBtn: {
    backgroundColor: CampusTheme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addBtnText: {
    color: CampusTheme.colors.background,
    fontSize: 13,
    fontWeight: '800',
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CampusTheme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 8,
  },
  stepperBtn: {
    padding: 4,
  },
  stepperQty: {
    color: CampusTheme.colors.background,
    fontWeight: '800',
    fontSize: 13,
  },
  floatingCartContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 128 : 110,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 9999,
  },
  floatingCartBar: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: CampusTheme.colors.primary,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...CampusTheme.shadows.glow,
  },
  cartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartCountCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0D1411',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountText: {
    color: CampusTheme.colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  cartBarSummary: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D1411',
  },
  cartBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewCartText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D1411',
  },
  cartModalContainer: {
    flex: 1,
    backgroundColor: CampusTheme.colors.background,
  },
  cartModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  cartModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  cartModalSub: {
    fontSize: 13,
    color: CampusTheme.colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  closeCartBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A2A22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartItemsScroll: {
    flex: 1,
    padding: 20,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  cartItemDetails: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: CampusTheme.colors.text,
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 13,
    color: CampusTheme.colors.primary,
    fontWeight: '600',
  },
  cartStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162820',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 10,
  },
  cartStepperBtn: {
    padding: 4,
  },
  cartStepperCount: {
    color: CampusTheme.colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  paymentSection: {
    marginTop: 24,
    marginBottom: 30,
  },
  paymentSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    marginBottom: 12,
  },
  paymentOptionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  paymentOptionCard: {
    flex: 1,
    backgroundColor: '#15251E',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.12)',
  },
  activePaymentOption: {
    borderColor: CampusTheme.colors.primary,
    backgroundColor: '#1B3528',
  },
  paymentOptionName: {
    fontSize: 14,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    marginTop: 8,
  },
  activePaymentText: {
    color: CampusTheme.colors.primary,
  },
  paymentOptionDesc: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    marginTop: 2,
  },
  billBreakdown: {
    backgroundColor: '#15251E',
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billLabel: {
    fontSize: 13,
    color: CampusTheme.colors.textMuted,
  },
  billValue: {
    fontSize: 13,
    color: CampusTheme.colors.text,
    fontWeight: '600',
  },
  billRowTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
    marginTop: 4,
  },
  billTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  billTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
  },
  checkoutFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0E1713',
  },
  checkoutBtn: {
    backgroundColor: CampusTheme.colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: CampusTheme.colors.background,
    fontSize: 16,
    fontWeight: '800',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmCard: {
    backgroundColor: '#14231B',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CampusTheme.colors.primary,
  },
  confirmCheckCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: CampusTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  confirmOrderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: CampusTheme.colors.primary,
    marginTop: 4,
    marginBottom: 12,
  },
  confirmDesc: {
    fontSize: 13,
    color: CampusTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmOtpBox: {
    backgroundColor: '#1B3528',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: CampusTheme.colors.primary,
    marginBottom: 16,
  },
  confirmOtpLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  confirmOtpCode: {
    fontSize: 32,
    fontWeight: '900',
    color: CampusTheme.colors.text,
    letterSpacing: 4,
  },
  confirmPaymentNote: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    marginBottom: 22,
  },
  confirmOutletBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(142, 228, 175, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  confirmOutletText: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
  },
  confirmPaymentPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 18,
    width: '100%',
    alignItems: 'center',
  },
  confirmPaymentCash: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  confirmPaymentUpi: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: CampusTheme.colors.primary,
  },
  confirmPaymentPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  confirmPaymentCashText: {
    color: '#FDE047',
  },
  confirmPaymentUpiText: {
    color: CampusTheme.colors.primary,
  },
  // Active Order Live Tracker Banner
  activeOrderBanner: {
    backgroundColor: '#13231B',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(142, 228, 175, 0.3)',
    marginBottom: 20,
    overflow: 'hidden',
    ...CampusTheme.shadows.card,
  },
  activeOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(142, 228, 175, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(142, 228, 175, 0.15)',
  },
  activeOrderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeOrderPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CampusTheme.colors.primary,
  },
  activeOrderHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
    letterSpacing: 0.8,
  },
  activeStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D1411',
  },
  activeOrderBody: {
    padding: 14,
  },
  activeOrderMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  activeOrderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  activeOrderOwnerText: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    marginTop: 2,
  },
  activeOrderItemsSummary: {
    fontSize: 12,
    color: CampusTheme.colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  activeOtpCard: {
    backgroundColor: '#0E1712',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: CampusTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeOtpLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
    letterSpacing: 0.5,
  },
  activeOtpCode: {
    fontSize: 20,
    fontWeight: '900',
    color: CampusTheme.colors.text,
    letterSpacing: 2,
  },
  activePaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  activePaymentInfo: {
    flex: 1,
  },
  activePaymentTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  activePaymentMethodText: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    marginTop: 1,
  },
  switchUpiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: CampusTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  switchUpiBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: CampusTheme.colors.background,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: CampusTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: CampusTheme.colors.background,
    fontSize: 14,
    fontWeight: '800',
  },
  upiIconHeader: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1C3328',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  upiAmountText: {
    fontSize: 24,
    fontWeight: '900',
    color: CampusTheme.colors.primary,
    marginTop: 4,
    marginBottom: 6,
  },
  upiNoteText: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    marginBottom: 18,
    textAlign: 'center',
  },
  upiRefInputBox: {
    width: '100%',
    marginBottom: 16,
  },
  upiRefLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  upiInput: {
    backgroundColor: '#0E1712',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: CampusTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  upiFeedback: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  upiSuccess: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  upiError: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  upiFeedbackText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  upiSuccessText: {
    color: CampusTheme.colors.primary,
  },
  upiErrorText: {
    color: CampusTheme.colors.danger,
  },
  verifyPayBtn: {
    width: '100%',
    backgroundColor: CampusTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  verifyPayBtnText: {
    color: CampusTheme.colors.background,
    fontSize: 14,
    fontWeight: '800',
  },
  historyCard: {
    backgroundColor: '#15251E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.12)',
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyOrderNum: {
    fontSize: 16,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  historyStatusPill: {
    backgroundColor: CampusTheme.colors.primaryDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
  },
  historyItemsText: {
    fontSize: 13,
    color: CampusTheme.colors.textMuted,
    marginBottom: 10,
  },
  historyBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 8,
  },
  historyTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  historyPayText: {
    fontSize: 12,
    color: CampusTheme.colors.primary,
    fontWeight: '600',
  },
  historyOtpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#1C3328',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  historyOtpLabel: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    fontWeight: '600',
  },
  historyOtpValue: {
    fontSize: 14,
    fontWeight: '900',
    color: CampusTheme.colors.primary,
    letterSpacing: 2,
  },
});
