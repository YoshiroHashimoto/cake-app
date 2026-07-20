import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import QRCode from 'react-native-qrcode-svg';
import {
  fetchAllDishes,
  createOrder,
  fetchOrderByToken,
  fetchOrderStatusList,
  type Dish,
  type OrderItem,
  type OrderStatus,
  type OrderStatusItem,
} from './src/api';

const { width, height } = Dimensions.get('window');

const COLORS = {
  bg: '#1C1A17',
  bgCard: '#242220',
  bgCardHover: '#2A2826',
  gold: '#C9A84C',
  goldLight: '#E2C97E',
  text: '#F2EDE6',
  textMuted: '#8A8278',
  textLight: '#C8C0B4',
  border: '#3A3630',
  pink: '#FF6B9D',
  pinkDark: '#E5527E',
  green: '#4CAF50',
  orange: '#FF9800',
  red: '#F44336',
};

// ─── カートアイテム型 ──────────────────────────────────────────
type CartItem = {
  dish: Dish;
  quantity: number;
};

// ─── スプラッシュ画面 ─────────────────────────────────────────
function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(lineWidth, { toValue: 120, duration: 800, useNativeDriver: false }),
      ]),
      Animated.delay(1500),
      Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.splash, { opacity }]}>
      <Image
        source={{ uri: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663449649060/SrDbAtUByGQsjc7VQwyjcs/restaurant_hero-UvDWvGm34R6xY4cvtkJaYD.webp' }}
        style={styles.splashBg}
        resizeMode="cover"
      />
      <View style={styles.splashOverlay} />
      <View style={styles.splashContent}>
        <Animated.View style={{ opacity: titleOpacity, alignItems: 'center' }}>
          <Text style={styles.splashSubtitle}>FINE DINING</Text>
          <Animated.View style={[styles.splashLine, { width: lineWidth }]} />
          <Text style={styles.splashTitle}>Restaurant</Text>
          <Text style={styles.splashTagline}>An Exquisite Culinary Experience</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// ─── 料理カード ───────────────────────────────────────────────
function DishCard({
  dish,
  cartQty,
  onPress,
  onAddToCart,
}: {
  dish: Dish;
  cartQty: number;
  onPress: (d: Dish) => void;
  onAddToCart: (d: Dish) => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(dish)} activeOpacity={0.85}>
      <View style={styles.cardImageContainer}>
        {dish.imageUrl ? (
          <Image source={{ uri: dish.imageUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Text style={{ color: COLORS.textMuted, fontSize: 32 }}>🍽</Text>
          </View>
        )}
        {cartQty > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cartQty}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{dish.name}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>¥{dish.price.toLocaleString()}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => onAddToCart(dish)}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>＋ カートへ</Text>
          </TouchableOpacity>
        </View>
        {dish.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{dish.description}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─── 料理詳細モーダル ─────────────────────────────────────────
function DishDetailModal({
  dish,
  cartQty,
  visible,
  onClose,
  onAddToCart,
}: {
  dish: Dish | null;
  cartQty: number;
  visible: boolean;
  onClose: () => void;
  onAddToCart: (d: Dish) => void;
}) {
  if (!dish) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {dish.imageUrl && (
            <Image source={{ uri: dish.imageUrl }} style={styles.modalImage} resizeMode="cover" />
          )}
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>{dish.name}</Text>
            <View style={styles.modalDivider} />
            <Text style={styles.modalPrice}>¥{dish.price.toLocaleString()}</Text>
            {dish.description ? <Text style={styles.modalDesc}>{dish.description}</Text> : null}
            <TouchableOpacity
              style={styles.modalAddButton}
              onPress={() => { onAddToCart(dish); onClose(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalAddButtonText}>
                {cartQty > 0 ? `＋ カートへ追加（現在 ${cartQty}個）` : '＋ カートへ'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── 注文リストモーダル ───────────────────────────────────────
function CartModal({
  visible,
  cart,
  onClose,
  onUpdateQty,
  onOrder,
  ordering,
}: {
  visible: boolean;
  cart: CartItem[];
  onClose: () => void;
  onUpdateQty: (dishId: number, delta: number) => void;
  onOrder: () => void;
  ordering: boolean;
}) {
  const total = cart.reduce((s, i) => s + i.dish.price * i.quantity, 0);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: height * 0.85 }]}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>注文リスト</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          {cart.length === 0 ? (
            <View style={styles.cartEmpty}>
              <Text style={styles.cartEmptyText}>カートは空です</Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
                {cart.map((item) => (
                  <View key={item.dish.id} style={styles.cartItem}>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName} numberOfLines={1}>{item.dish.name}</Text>
                      <Text style={styles.cartItemPrice}>¥{item.dish.price.toLocaleString()}</Text>
                    </View>
                    <View style={styles.qtyControl}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => onUpdateQty(item.dish.id, -1)}
                      >
                        <Text style={styles.qtyBtnText}>－</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => onUpdateQty(item.dish.id, 1)}
                      >
                        <Text style={styles.qtyBtnText}>＋</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.cartFooter}>
                <View style={styles.cartTotalRow}>
                  <Text style={styles.cartTotalLabel}>合計</Text>
                  <Text style={styles.cartTotalPrice}>¥{total.toLocaleString()}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.orderButton, ordering && styles.orderButtonDisabled]}
                  onPress={onOrder}
                  disabled={ordering}
                  activeOpacity={0.8}
                >
                  {ordering ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.orderButtonText}>注文する</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── QRコード画面モーダル ─────────────────────────────────────
function QRModal({
  visible,
  orderNo,
  qrToken,
  onClose,
  onCheckStatus,
}: {
  visible: boolean;
  orderNo: string;
  qrToken: string;
  onClose: () => void;
  onCheckStatus: () => void;
}) {
  const BASE_URL = 'https://restadmin-srdbatub.manus.space';
  const statusUrl = `${BASE_URL}/status?token=${qrToken}`;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.qrContent}>
          <Text style={styles.qrTitle}>ご注文ありがとうございます！</Text>
          <View style={styles.qrOrderNo}>
            <Text style={styles.qrOrderNoLabel}>注文番号</Text>
            <Text style={styles.qrOrderNoText}>{orderNo}</Text>
          </View>
          <View style={styles.qrBox}>
            <QRCode
              value={statusUrl}
              size={200}
              color={COLORS.bg}
              backgroundColor={COLORS.text}
            />
          </View>
          <Text style={styles.qrHint}>QRコードをスキャンすると{'\n'}準備状況を確認できます</Text>
          <TouchableOpacity style={styles.statusButton} onPress={onCheckStatus} activeOpacity={0.8}>
            <Text style={styles.statusButtonText}>準備状況を確認する</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qrCloseButton} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.qrCloseButtonText}>メニューに戻る</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── 準備状況画面モーダル ─────────────────────────────────────
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: '受付中',
  preparing: '調理中',
  ready: '準備完了',
};
const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: COLORS.textMuted,
  preparing: COLORS.orange,
  ready: COLORS.green,
};

function StatusModal({
  visible,
  myOrderNo,
  onClose,
}: {
  visible: boolean;
  myOrderNo: string;
  onClose: () => void;
}) {
  const [list, setList] = useState<OrderStatusItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOrderStatusList();
      setList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      load();
      const timer = setInterval(load, 15000);
      return () => clearInterval(timer);
    }
  }, [visible, load]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: height * 0.85 }]}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>準備状況</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          {loading && list.length === 0 ? (
            <View style={styles.cartEmpty}>
              <ActivityIndicator color={COLORS.gold} size="large" />
            </View>
          ) : list.length === 0 ? (
            <View style={styles.cartEmpty}>
              <Text style={styles.cartEmptyText}>注文情報がありません</Text>
            </View>
          ) : (
            <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
              {list.map((order) => {
                const isMyOrder = order.orderNo === myOrderNo;
                return (
                  <View
                    key={order.id}
                    style={[styles.statusItem, isMyOrder && styles.statusItemMine]}
                  >
                    <View style={styles.statusItemLeft}>
                      {isMyOrder && (
                        <Text style={styles.statusMyLabel}>あなたの注文</Text>
                      )}
                      <Text style={[styles.statusOrderNo, isMyOrder && styles.statusOrderNoMine]}>
                        {order.orderNo}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[order.status] + '22' }]}>
                      <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[order.status] }]}>
                        {STATUS_LABEL[order.status]}
                      </Text>
                    </View>
                  </View>
                );
              })}
              <Text style={styles.statusRefreshHint}>15秒ごとに自動更新されます</Text>
            </ScrollView>
          )}
          <View style={styles.cartFooter}>
            <TouchableOpacity style={styles.orderButton} onPress={load} activeOpacity={0.8}>
              <Text style={styles.orderButtonText}>今すぐ更新</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── メインアプリ ─────────────────────────────────────────────
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lunch' | 'dinner'>('lunch');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const tabIndicator = useRef(new Animated.Value(0)).current;

  // カート状態
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [ordering, setOrdering] = useState(false);

  // 注文完了後
  const [qrVisible, setQrVisible] = useState(false);
  const [orderNo, setOrderNo] = useState('');
  const [qrToken, setQrToken] = useState('');

  // 準備状況
  const [statusVisible, setStatusVisible] = useState(false);

  // FABアニメーション
  const fabScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchAllDishes().then(setDishes).catch(console.error).finally(() => setLoading(false));
  }, []);

  // カートに追加
  const handleAddToCart = useCallback((dish: Dish) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.dish.id === dish.id);
      if (existing) {
        return prev.map((i) => i.dish.id === dish.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { dish, quantity: 1 }];
    });
    // FABをバウンス
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(fabScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [fabScale]);

  // カート数量変更
  const handleUpdateQty = useCallback((dishId: number, delta: number) => {
    setCart((prev) => {
      const updated = prev.map((i) =>
        i.dish.id === dishId ? { ...i, quantity: i.quantity + delta } : i
      ).filter((i) => i.quantity > 0);
      return updated;
    });
  }, []);

  // 注文確定
  const handleOrder = useCallback(async () => {
    if (cart.length === 0) return;
    setOrdering(true);
    try {
      const items = cart.map((i) => ({
        dishId: i.dish.id,
        name: i.dish.name,
        price: i.dish.price,
        quantity: i.quantity,
      }));
      const result = await createOrder(items);
      setOrderNo(result.orderNo);
      setQrToken(result.qrToken);
      setCart([]);
      setCartVisible(false);
      setQrVisible(true);
    } catch (e) {
      Alert.alert('エラー', '注文の送信に失敗しました。もう一度お試しください。');
    } finally {
      setOrdering(false);
    }
  }, [cart]);

  const handleTabChange = (tab: 'lunch' | 'dinner') => {
    setActiveTab(tab);
    Animated.spring(tabIndicator, { toValue: tab === 'lunch' ? 0 : 1, useNativeDriver: false, tension: 80, friction: 10 }).start();
  };

  const filteredDishes = dishes.filter((d) => d.category === activeTab);
  const totalCartQty = cart.reduce((s, i) => s + i.quantity, 0);

  if (showSplash) {
    return (
      <>
        <StatusBar style="light" />
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </>
    );
  }

  const tabIndicatorLeft = tabIndicator.interpolate({ inputRange: [0, 1], outputRange: ['2%', '52%'] });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.headerTopLine} />
        <Text style={styles.headerSubtitle}>FINE DINING</Text>
        <Text style={styles.headerTitle}>Restaurant</Text>
        <View style={styles.headerBottomLine} />
      </View>
      <View style={styles.tabBar}>
        <View style={styles.tabBarInner}>
          <Animated.View style={[styles.tabIndicator, { left: tabIndicatorLeft }]} />
          <TouchableOpacity style={styles.tab} onPress={() => handleTabChange('lunch')} activeOpacity={0.8}>
            <Text style={[styles.tabText, activeTab === 'lunch' && styles.tabTextActive]}>Lunch</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab} onPress={() => handleTabChange('dinner')} activeOpacity={0.8}>
            <Text style={[styles.tabText, activeTab === 'dinner' && styles.tabTextActive]}>Dinner</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.gold} size="large" />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      ) : filteredDishes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No dishes available</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDishes}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <DishCard
              dish={item}
              cartQty={cart.find((c) => c.dish.id === item.id)?.quantity ?? 0}
              onPress={(d) => { setSelectedDish(d); setDetailVisible(true); }}
              onAddToCart={handleAddToCart}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FABボタン（カート） */}
      {totalCartQty > 0 && (
        <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
          <TouchableOpacity
            style={styles.fabInner}
            onPress={() => setCartVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.fabIcon}>🛒</Text>
            <Text style={styles.fabText}>注文リスト</Text>
            <View style={styles.fabBadge}>
              <Text style={styles.fabBadgeText}>{totalCartQty}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* 準備状況ボタン（注文後に表示） */}
      {orderNo !== '' && (
        <TouchableOpacity
          style={styles.statusFab}
          onPress={() => setStatusVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.statusFabText}>📋 準備状況</Text>
        </TouchableOpacity>
      )}

      {/* 詳細モーダル */}
      <DishDetailModal
        dish={selectedDish}
        cartQty={selectedDish ? (cart.find((c) => c.dish.id === selectedDish.id)?.quantity ?? 0) : 0}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onAddToCart={handleAddToCart}
      />

      {/* カートモーダル */}
      <CartModal
        visible={cartVisible}
        cart={cart}
        onClose={() => setCartVisible(false)}
        onUpdateQty={handleUpdateQty}
        onOrder={handleOrder}
        ordering={ordering}
      />

      {/* QRコードモーダル */}
      <QRModal
        visible={qrVisible}
        orderNo={orderNo}
        qrToken={qrToken}
        onClose={() => setQrVisible(false)}
        onCheckStatus={() => { setQrVisible(false); setStatusVisible(true); }}
      />

      {/* 準備状況モーダル */}
      <StatusModal
        visible={statusVisible}
        myOrderNo={orderNo}
        onClose={() => setStatusVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── スタイル ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Splash
  splash: { flex: 1, backgroundColor: COLORS.bg, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  splashBg: { position: 'absolute', width: '100%', height: '100%' },
  splashOverlay: { position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(28,26,23,0.72)' },
  splashContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashSubtitle: { color: COLORS.gold, fontSize: 11, letterSpacing: 6, fontWeight: '300', marginBottom: 16 },
  splashLine: { height: 1, backgroundColor: COLORS.gold, marginBottom: 16, opacity: 0.7 },
  splashTitle: { color: COLORS.text, fontSize: 48, fontWeight: '300', letterSpacing: 4, marginBottom: 12 },
  splashTagline: { color: COLORS.textMuted, fontSize: 12, letterSpacing: 2, fontWeight: '300' },

  // Layout
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { alignItems: 'center', paddingTop: Platform.OS === 'android' ? 20 : 8, paddingBottom: 16, paddingHorizontal: 24 },
  headerTopLine: { width: 40, height: 1, backgroundColor: COLORS.gold, opacity: 0.5, marginBottom: 12 },
  headerSubtitle: { color: COLORS.gold, fontSize: 10, letterSpacing: 5, fontWeight: '300', marginBottom: 4 },
  headerTitle: { color: COLORS.text, fontSize: 28, fontWeight: '300', letterSpacing: 3, marginBottom: 12 },
  headerBottomLine: { width: '100%', height: 1, backgroundColor: COLORS.border },

  // Tab
  tabBar: { paddingHorizontal: 20, paddingVertical: 12 },
  tabBarInner: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderRadius: 8, padding: 4, position: 'relative', height: 44 },
  tabIndicator: { position: 'absolute', top: 4, width: '46%', height: 36, backgroundColor: COLORS.bgCardHover, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  tabText: { color: COLORS.textMuted, fontSize: 13, letterSpacing: 1.5, fontWeight: '400' },
  tabTextActive: { color: COLORS.gold, fontWeight: '500' },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 120, gap: 12 },

  // Card
  card: { backgroundColor: COLORS.bgCard, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  cardImageContainer: { position: 'relative' },
  cardImage: { width: '100%', height: 200 },
  cardImagePlaceholder: { backgroundColor: COLORS.bgCardHover, alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: COLORS.pink, borderRadius: 12, minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  cartBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cardBody: { padding: 16 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardName: { color: COLORS.text, fontSize: 18, fontWeight: '300', letterSpacing: 0.5, marginBottom: 8 },
  cardPrice: { color: COLORS.gold, fontSize: 15, fontWeight: '500' },
  cardDesc: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, fontWeight: '300' },
  addButton: { backgroundColor: COLORS.pink, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Loading / Empty
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: COLORS.textMuted, fontSize: 13, letterSpacing: 2 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, letterSpacing: 1 },

  // FAB
  fab: { position: 'absolute', bottom: 32, left: 20, right: 20 },
  fabInner: { backgroundColor: COLORS.pink, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 24, gap: 8, shadowColor: COLORS.pink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  fabIcon: { fontSize: 20 },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  fabBadge: { backgroundColor: '#fff', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  fabBadgeText: { color: COLORS.pink, fontSize: 12, fontWeight: '700' },

  // Status FAB
  statusFab: { position: 'absolute', bottom: 32, right: 20, backgroundColor: COLORS.bgCard, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 18, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  statusFabText: { color: COLORS.gold, fontSize: 14, fontWeight: '500' },

  // Modal base
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  modalImage: { width: '100%', height: 280 },
  modalClose: { position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(28,26,23,0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  modalCloseText: { color: COLORS.text, fontSize: 14, fontWeight: '300' },
  modalBody: { padding: 24, paddingTop: 16 },
  modalTitle: { color: COLORS.text, fontSize: 26, fontWeight: '300', letterSpacing: 0.5, marginBottom: 12 },
  modalDivider: { height: 1, backgroundColor: COLORS.gold, opacity: 0.3, marginBottom: 12 },
  modalPrice: { color: COLORS.gold, fontSize: 20, fontWeight: '500', marginBottom: 16 },
  modalDesc: { color: COLORS.textLight, fontSize: 15, lineHeight: 26, fontWeight: '300', marginBottom: 24 },
  modalAddButton: { backgroundColor: COLORS.pink, borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginBottom: 32 },
  modalAddButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Cart modal
  cartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cartTitle: { color: COLORS.text, fontSize: 18, fontWeight: '500', letterSpacing: 0.5 },
  cartEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  cartEmptyText: { color: COLORS.textMuted, fontSize: 15 },
  cartList: { maxHeight: height * 0.45 },
  cartItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cartItemInfo: { flex: 1, marginRight: 12 },
  cartItemName: { color: COLORS.text, fontSize: 15, fontWeight: '400', marginBottom: 4 },
  cartItemPrice: { color: COLORS.gold, fontSize: 13 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.bgCardHover, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { color: COLORS.text, fontSize: 16, lineHeight: 20 },
  qtyText: { color: COLORS.text, fontSize: 16, fontWeight: '500', minWidth: 24, textAlign: 'center' },
  cartFooter: { padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border },
  cartTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cartTotalLabel: { color: COLORS.textLight, fontSize: 15 },
  cartTotalPrice: { color: COLORS.gold, fontSize: 22, fontWeight: '600' },
  orderButton: { backgroundColor: COLORS.pink, borderRadius: 24, paddingVertical: 14, alignItems: 'center' },
  orderButtonDisabled: { opacity: 0.6 },
  orderButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // QR modal
  qrContent: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 32, alignItems: 'center' },
  qrTitle: { color: COLORS.text, fontSize: 20, fontWeight: '400', letterSpacing: 0.5, marginBottom: 20, textAlign: 'center' },
  qrOrderNo: { alignItems: 'center', marginBottom: 24 },
  qrOrderNoLabel: { color: COLORS.textMuted, fontSize: 12, letterSpacing: 2, marginBottom: 6 },
  qrOrderNoText: { color: COLORS.gold, fontSize: 36, fontWeight: '700', letterSpacing: 4 },
  qrBox: { backgroundColor: COLORS.text, padding: 16, borderRadius: 12, marginBottom: 16 },
  qrHint: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  statusButton: { backgroundColor: COLORS.gold, borderRadius: 24, paddingVertical: 13, paddingHorizontal: 32, marginBottom: 12, width: '100%', alignItems: 'center' },
  statusButtonText: { color: COLORS.bg, fontSize: 15, fontWeight: '600' },
  qrCloseButton: { paddingVertical: 13, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  qrCloseButtonText: { color: COLORS.textMuted, fontSize: 14 },

  // Status modal
  statusItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statusItemMine: { backgroundColor: COLORS.gold + '11' },
  statusItemLeft: {},
  statusMyLabel: { color: COLORS.gold, fontSize: 10, letterSpacing: 1.5, marginBottom: 4 },
  statusOrderNo: { color: COLORS.text, fontSize: 18, fontWeight: '500', letterSpacing: 2 },
  statusOrderNoMine: { color: COLORS.gold, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  statusBadgeText: { fontSize: 13, fontWeight: '600' },
  statusRefreshHint: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', padding: 16 },
});
