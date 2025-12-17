import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
  SafeAreaView, Alert, Modal, StatusBar, Platform, ActivityIndicator,
  RefreshControl, Dimensions 
} from 'react-native';
// หากรันในเครื่องตัวเองโดยไม่มี Expo อาจต้องติดตั้ง: npm install @expo/vector-icons
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ==========================================
// ⚠️ URL Database ของคุณ
// ==========================================
const YOUR_SHEET_URL = "https://script.google.com/macros/s/AKfycbzc1jP70TDLEEASbOHK4eeQkt7up8riaUGXJS-ZefUSxRWbLUSueyiGxbT-zkq6FRW4/exec";

// บรรทัดนี้สำหรับระบบ Preview
const GOOGLE_SHEET_URL = typeof __sheet_url !== 'undefined' ? __sheet_url : YOUR_SHEET_URL;

// --- Helper Functions ---
const formatThaiDate = (date) => {
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  return `วัน${days[date.getDay()]}ที่ ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
};

const formatShortDate = (date) => {
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
};

const formatMonthOnly = (date) => {
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  return `${months[date.getMonth()]} ${date.getFullYear() + 543}`;
};

// --- Components ---
const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// --- Main App ---
export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  
  // View State (สำคัญ: เพิ่มโหมดรายวัน/รายเดือน)
  const [viewMode, setViewMode] = useState('monthly'); // 'daily' | 'monthly'
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [todayDate, setTodayDate] = useState(new Date());

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('อาหารทั่วไป');
  const [modalVisible, setModalVisible] = useState(false);

  // Check URL validity
  const isValidUrl = GOOGLE_SHEET_URL && GOOGLE_SHEET_URL.startsWith('http') && !GOOGLE_SHEET_URL.includes('วาง_URL');

  useEffect(() => {
    const timer = setInterval(() => setTodayDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 1. Fetch Data
  const fetchTransactions = useCallback(async (isAuto = false) => {
    if (!isValidUrl) {
      setLoading(false);
      return;
    }
    try {
      if (isAuto) setIsAutoSyncing(true);
      const response = await fetch(GOOGLE_SHEET_URL);
      const data = await response.json();
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(data);
    } catch (error) {
      console.log("Sync Error");
    } finally {
      setLoading(false);
      setRefreshing(false);
      if (isAuto) setTimeout(() => setIsAutoSyncing(false), 1000);
    }
  }, [isValidUrl]);

  useEffect(() => {
    fetchTransactions();
    const intervalId = setInterval(() => {
      if (isValidUrl) fetchTransactions(true);
    }, 10000);
    return () => clearInterval(intervalId);
  }, [fetchTransactions, isValidUrl]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, [fetchTransactions]);

  // ฟังก์ชันเปลี่ยนวันที่/เดือน (ตามโหมดที่เลือก)
  const changeDate = (n) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'daily') {
      newDate.setDate(newDate.getDate() + n); // เพิ่ม/ลด วัน
    } else {
      newDate.setMonth(newDate.getMonth() + n); // เพิ่ม/ลด เดือน
    }
    setCurrentDate(newDate);
  };

  // 2. Add Transaction
  const handleAdd = async () => {
    if (!title || !amount) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูล');
      return;
    }
    const tempId = Date.now().toString();
    const newTx = {
      id: tempId, title, amount: parseFloat(amount), type, category, date: new Date().toISOString()
    };
    setTransactions(prev => [newTx, ...prev]);
    setModalVisible(false);
    setTitle(''); setAmount('');

    if (isValidUrl) {
      try {
        await fetch(GOOGLE_SHEET_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'add', ...newTx })
        });
        fetchTransactions(true);
      } catch (e) { Alert.alert('แจ้งเตือน', 'บันทึก offline'); }
    }
  };

  // 3. Delete Transaction
  const handleDelete = (id) => {
    Alert.alert("ลบรายการ", "ต้องการลบรายการนี้ใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: async () => {
          setTransactions(prev => prev.filter(t => t.id !== id));
          if (isValidUrl) {
            try {
              await fetch(GOOGLE_SHEET_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'delete', id: id })
              });
            } catch (e) {}
          }
        }
      }
    ]);
  };

  // --- Calculations ---
  
  // 1. Filter Transactions based on View Mode
  const viewTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    const sameMonth = d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    
    if (viewMode === 'monthly') {
      return sameMonth;
    } else {
      return sameMonth && d.getDate() === currentDate.getDate();
    }
  });

  // 2. Global Balance (คงเหลือสุทธิ ทั้งหมด)
  // หักค่าอาหารเย็นออกจากการคำนวณเงินคงเหลือ ตามที่ขอ
  const totalIncomeAll = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalGeneralExpenseAll = transactions
    .filter(t => t.type === 'expense' && t.category !== 'อาหารเย็น')
    .reduce((sum, t) => sum + t.amount, 0);
  const globalBalance = totalIncomeAll - totalGeneralExpenseAll;

  // 3. Stats for Current View (ตามวันที่เลือก)
  const periodIncome = viewTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const periodGeneralExpense = viewTransactions
    .filter(t => t.type === 'expense' && t.category !== 'อาหารเย็น')
    .reduce((sum, t) => sum + t.amount, 0);

  // 4. Dinner Budget Logic
  // ถ้าดูรายวัน: เทียบกับ 200 บาท
  // ถ้าดูรายเดือน: เทียบกับงบสะสมของเดือนนั้น
  const DINNER_BUDGET_PER_DAY = 200;
  let dinnerBudgetToShow = 0;
  
  if (viewMode === 'daily') {
    dinnerBudgetToShow = DINNER_BUDGET_PER_DAY;
  } else {
    // โหมดรายเดือน
    const isCurrentMonth = todayDate.getMonth() === currentDate.getMonth() && todayDate.getFullYear() === currentDate.getFullYear();
    const isPastMonth = currentDate < new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    
    if (isCurrentMonth) {
      dinnerBudgetToShow = todayDate.getDate() * DINNER_BUDGET_PER_DAY;
    } else if (isPastMonth) {
      dinnerBudgetToShow = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() * DINNER_BUDGET_PER_DAY;
    } else {
      dinnerBudgetToShow = 0; // อนาคต
    }
  }

  const periodDinnerSpent = viewTransactions
    .filter(t => t.type === 'expense' && t.category === 'อาหารเย็น')
    .reduce((sum, t) => sum + t.amount, 0);

  const dinnerRemaining = dinnerBudgetToShow - periodDinnerSpent;

  if (loading) {
    return (
      <View style={[styles.container, {justifyContent:'center', alignItems:'center'}]}>
        <ActivityIndicator size="large" color="#109D59" />
        <Text style={{marginTop: 10, color: '#64748B'}}>กำลังเชื่อมต่อ...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={{flexDirection:'column', alignItems: 'flex-start'}}>
          <Text style={styles.dateText}>{formatThaiDate(todayDate)}</Text>
          <View style={{flexDirection:'row', alignItems:'center', marginTop: 4}}>
            <View style={[styles.iconBg, {backgroundColor: '#E6F4EA'}]}>
              <MaterialCommunityIcons name="google-spreadsheet" size={24} color="#109D59" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Money Tracker</Text>
              <View style={{flexDirection:'row', alignItems:'center', marginLeft: 10}}>
                <Text style={styles.headerSubtitle}>
                  {isValidUrl ? 'Cloud Sync' : 'Offline Mode'}
                </Text>
                {isAutoSyncing && (
                   <ActivityIndicator size="small" color="#109D59" style={{marginLeft: 6}} />
                )}
              </View>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButtonSmall}>
          <MaterialCommunityIcons name="plus" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#109D59" />
        }
      >
        
        {/* Toggle View Mode */}
        <View style={styles.viewModeContainer}>
          <TouchableOpacity 
            style={[styles.viewModeBtn, viewMode === 'daily' && styles.viewModeBtnActive]}
            onPress={() => setViewMode('daily')}
          >
            <Text style={[styles.viewModeText, viewMode === 'daily' && styles.viewModeTextActive]}>รายวัน</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewModeBtn, viewMode === 'monthly' && styles.viewModeBtnActive]}
            onPress={() => setViewMode('monthly')}
          >
            <Text style={[styles.viewModeText, viewMode === 'monthly' && styles.viewModeTextActive]}>รายเดือน</Text>
          </TouchableOpacity>
        </View>

        {/* Date Navigator */}
        <View style={styles.dateNavigator}>
          <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navBtn}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#334155" />
          </TouchableOpacity>
          <View style={{alignItems: 'center'}}>
            <Text style={styles.navTextMain}>
              {viewMode === 'daily' ? formatShortDate(currentDate) : formatMonthOnly(currentDate)}
            </Text>
            {viewMode === 'daily' && currentDate.toDateString() === todayDate.toDateString() && (
              <Text style={{fontSize: 10, color: '#109D59', fontWeight: 'bold'}}>วันนี้</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => changeDate(1)} style={styles.navBtn}>
            <MaterialCommunityIcons name="chevron-right" size={28} color="#334155" />
          </TouchableOpacity>
        </View>

        {/* Main Balance Card (แสดงยอดรวมทั้งหมดเสมอ) */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>ยอดเงินคงเหลือสุทธิ (ไม่รวมอาหารเย็น)</Text>
          <Text style={styles.balanceAmount}>฿{globalBalance.toLocaleString()}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                <MaterialCommunityIcons name="arrow-up" size={16} color="#10B981" />
              </View>
              <View>
                <Text style={styles.statLabel}>รายรับ ({viewMode === 'daily' ? 'วันนี้' : 'เดือนนี้'})</Text>
                <Text style={styles.statValueIncome}>+{periodIncome.toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                <MaterialCommunityIcons name="arrow-down" size={16} color="#EF4444" />
              </View>
              <View>
                <Text style={styles.statLabel}>จ่ายทั่วไป ({viewMode === 'daily' ? 'วันนี้' : 'เดือนนี้'})</Text>
                <Text style={styles.statValueExpense}>-{periodGeneralExpense.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- Dinner Budget Card --- */}
        <View style={styles.dinnerCard}>
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
            <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
              <View style={styles.dinnerIconBg}>
                <MaterialCommunityIcons name="food-fork-drink" size={20} color="#F97316" />
              </View>
              <Text style={styles.dinnerTitle}>
                งบอาหารเย็น ({viewMode === 'daily' ? 'วันนี้' : 'เดือนนี้'})
              </Text>
            </View>
            {viewMode === 'daily' && (
              <Text style={{fontSize: 10, color: '#F97316', backgroundColor: '#FFEDD5', paddingHorizontal:8, paddingVertical:4, borderRadius:8}}>
                เป้า: 200฿
              </Text>
            )}
          </View>
          
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end'}}>
            <View>
              <Text style={{fontSize: 12, color: '#9A3412'}}>ใช้ไป</Text>
              <Text style={{fontSize: 20, fontWeight: 'bold', color: '#C2410C'}}>{periodDinnerSpent.toLocaleString()}</Text>
              <Text style={{fontSize: 10, color: '#FB923C'}}>จากงบ {dinnerBudgetToShow.toLocaleString()}</Text>
            </View>
            <View style={{alignItems:'flex-end'}}>
              <Text style={{fontSize: 12, color: '#9A3412'}}>คงเหลือ</Text>
              <Text style={{fontSize: 24, fontWeight: 'bold', color: dinnerRemaining >= 0 ? '#16A34A' : '#DC2626'}}>
                {dinnerRemaining > 0 ? '+' : ''}{dinnerRemaining.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
        
        {/* List Header */}
        <View style={{flexDirection:'row', alignItems:'center', gap: 6, marginBottom: 15, marginTop: 10}}>
          <Text style={styles.sectionTitle}>
            รายการ {viewMode === 'daily' ? 'ประจำวัน' : 'ประจำเดือน'}
          </Text>
          {isValidUrl && (
            <Text style={{fontSize:10, color: isAutoSyncing ? '#109D59' : '#94A3B8'}}>
              {isAutoSyncing ? '• กำลังอัปเดต...' : '• อัปเดตทุก 10 วิ'}
            </Text>
          )}
        </View>
        
        {/* Transactions List */}
        {viewTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>ไม่มีรายการในช่วงนี้</Text>
          </View>
        ) : (
          viewTransactions.map(t => (
            <TouchableOpacity key={t.id} onLongPress={() => handleDelete(t.id)} activeOpacity={0.7}>
              <Card style={styles.txItem}>
                <View style={styles.txLeft}>
                  <View style={[styles.txIcon, 
                    t.type === 'income' ? styles.bgGreen : 
                    t.category === 'อาหารเย็น' ? styles.bgOrange : styles.bgRed
                  ]}>
                    <MaterialCommunityIcons 
                      name={
                        t.type === 'income' ? "bank-transfer-in" : 
                        t.category === 'อาหารเย็น' ? "food-drumstick" : "basket-outline"
                      } 
                      size={20} 
                      color={
                        t.type === 'income' ? "#059669" : 
                        t.category === 'อาหารเย็น' ? "#EA580C" : "#DC2626"
                      } 
                    />
                  </View>
                  <View>
                    <Text style={styles.txTitle}>{t.title}</Text>
                    <Text style={styles.txCategory}>
                      {t.category} • {new Date(t.date).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})} {new Date(t.date).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.txAmount, t.type === 'income' ? styles.textGreen : styles.textRed]}>
                  {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                </Text>
              </Card>
            </TouchableOpacity>
          ))
        )}

        <View style={{height: 100}} /> 
      </ScrollView>

      {/* Add Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>บันทึกรายการ</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.typeSwitcher}>
              <TouchableOpacity 
                style={[styles.typeBtn, type === 'income' && styles.typeBtnActiveGreen]} 
                onPress={() => setType('income')}
              >
                <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>รายรับ</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.typeBtn, type === 'expense' && styles.typeBtnActiveRed]} 
                onPress={() => setType('expense')}
              >
                <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>รายจ่าย</Text>
              </TouchableOpacity>
            </View>

            <TextInput 
              style={styles.input} 
              placeholder="จำนวนเงิน (บาท)" 
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
            
            <TextInput 
              style={styles.input} 
              placeholder="ชื่อรายการ (เช่น ค่าข้าว)" 
              value={title}
              onChangeText={setTitle}
            />

            <Text style={{fontSize: 12, fontWeight: 'bold', color: '#64748B', marginBottom: 8, marginTop: 4}}>เลือกหมวดหมู่</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {[
                'อาหารทั่วไป', 
                'อาหารเย็น', 
                'เดินทาง', 
                'ช้อปปิ้ง', 
                'อื่นๆ', 
                'เงินเดือน', 
                'โบนัส'
              ].map(c => (
                <TouchableOpacity 
                  key={c} 
                  style={[
                    styles.catChip, 
                    category === c && styles.catChipActive,
                    c === 'อาหารเย็น' && category === c && { backgroundColor: '#F97316', borderColor: '#F97316' }
                  ]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
              <Text style={styles.saveBtnText}>บันทึก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff' 
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginLeft: 10 },
  headerSubtitle: { fontSize: 10, color: '#109D59', fontWeight: '600' },
  dateText: { fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 2 },
  iconBg: { backgroundColor: '#EEF2FF', padding: 8, borderRadius: 12 },
  addButtonSmall: { backgroundColor: '#109D59', padding: 8, borderRadius: 12 },
  
  scrollContent: { padding: 20 },

  // View Mode Switcher
  viewModeContainer: {
    flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4, marginBottom: 15
  },
  viewModeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  viewModeBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
  viewModeText: { color: '#64748B', fontWeight: '600' },
  viewModeTextActive: { color: '#109D59', fontWeight: 'bold' },

  // Date Navigator
  dateNavigator: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 10, marginBottom: 15,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 1
  },
  navBtn: { padding: 5 },
  navTextMain: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
  
  balanceCard: {
    backgroundColor: '#109D59', borderRadius: 24, padding: 20, marginBottom: 15,
    shadowColor: "#109D59", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10
  },
  balanceLabel: { color: '#E0E7FF', fontSize: 14, marginBottom: 4 },
  balanceAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginBottom: 20 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 15 },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIcon: { padding: 8, borderRadius: 20 },
  statLabel: { color: '#E0E7FF', fontSize: 12 },
  statValueIncome: { color: '#6EE7B7', fontWeight: 'bold', fontSize: 16 },
  statValueExpense: { color: '#FCA5A5', fontWeight: 'bold', fontSize: 16 },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 15 },

  // Dinner Card Styles
  dinnerCard: {
    backgroundColor: '#FFF7ED', borderRadius: 20, padding: 16, marginBottom: 25,
    borderWidth: 1, borderColor: '#FED7AA'
  },
  dinnerIconBg: { backgroundColor: '#FFEDD5', padding: 6, borderRadius: 10 },
  dinnerTitle: { fontSize: 16, fontWeight: 'bold', color: '#9A3412' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#334155' },
  txItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, marginBottom: 10 },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIcon: { padding: 10, borderRadius: 12 },
  bgGreen: { backgroundColor: '#ECFDF5' },
  bgRed: { backgroundColor: '#FEF2F2' },
  bgOrange: { backgroundColor: '#FFF7ED' },
  txTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  txCategory: { fontSize: 12, color: '#64748B', marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: 'bold' },
  textGreen: { color: '#059669' },
  textRed: { color: '#DC2626' },

  card: { backgroundColor: '#fff', borderRadius: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  
  emptyState: { alignItems: 'center', marginTop: 40, opacity: 0.5 },
  emptyText: { marginTop: 10, color: '#64748B' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  
  input: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12 },
  
  typeSwitcher: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20 },
  typeBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 10 },
  typeBtnActiveGreen: { backgroundColor: '#10B981' },
  typeBtnActiveRed: { backgroundColor: '#EF4444' },
  typeText: { fontWeight: '600', color: '#64748B' },
  typeTextActive: { color: '#fff' },

  catScroll: { maxHeight: 50, marginBottom: 20 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8 },
  catChipActive: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
  catText: { color: '#64748B' },
  catTextActive: { color: '#fff' },

  saveBtn: { backgroundColor: '#109D59', padding: 16, borderRadius: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});