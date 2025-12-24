Source Code (React Native)คุณสามารถคัดลอกโค้ดด้านล่างนี้ไปวางในไฟล์ app/index.tsx ในโปรเจกต์ React Native (Expo) ของคุณได้เลยครับimport React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
  SafeAreaView, Alert, Modal, StatusBar, Platform, ActivityIndicator,
  RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ==========================================
// ⚠️ URL Database ของคุณ
// ==========================================
const YOUR_SHEET_URL = "[https://script.google.com/macros/s/AKfycbzc1jP70TDLEEASbOHK4eeQkt7up8riaUGXJS-ZefUSxRWbLUSueyiGxbT-zkq6FRW4/exec](https://script.google.com/macros/s/AKfycbzc1jP70TDLEEASbOHK4eeQkt7up8riaUGXJS-ZefUSxRWbLUSueyiGxbT-zkq6FRW4/exec)";

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  
  // View State
  const [viewMode, setViewMode] = useState('monthly'); // 'daily' | 'monthly'
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [todayDate, setTodayDate] = useState(new Date());

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('อาหารทั่วไป');
  const [modalVisible, setModalVisible] = useState(false);

  const GOOGLE_SHEET_URL = YOUR_SHEET_URL;
  const isValidUrl = GOOGLE_SHEET_URL && GOOGLE_SHEET_URL.startsWith('http');

  useEffect(() => {
    const timer = setInterval(() => setTodayDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // --- 1. Fetch Data ---
  const fetchTransactions = useCallback(async (isAuto = false) => {
    if (!isValidUrl) {
      setLoading(false);
      return;
    }
    try {
      if (isAuto) setIsAutoSyncing(true);
      const response = await fetch(GOOGLE_SHEET_URL);
      const data = await response.json();
      if (Array.isArray(data)) {
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(data);
      }
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
    }, 15000);
    return () => clearInterval(intervalId);
  }, [fetchTransactions, isValidUrl]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, [fetchTransactions]);

  // --- 2. Helper Functions ---
  const changeDate = (n) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'daily') {
      newDate.setDate(newDate.getDate() + n);
    } else {
      newDate.setMonth(newDate.getMonth() + n);
    }
    setCurrentDate(newDate);
  };

  const formatThaiDate = (date) => {
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
  };

  const formatMonthOnly = (date) => {
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return `${months[date.getMonth()]} ${date.getFullYear() + 543}`;
  };

  // --- 3. Add Transaction ---
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
      } catch (e) { console.log('Saved offline'); }
    }
  };

  // --- 4. Calculations Logic ---
  
  const viewTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    const sameMonth = d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    if (viewMode === 'monthly') return sameMonth;
    return sameMonth && d.getDate() === currentDate.getDate();
  });

  // ยอดคงเหลือสุทธิ (ไม่รวมอาหารเย็น)
  const totalIncomeAll = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalGeneralExpenseAll = transactions
    .filter(t => t.type === 'expense' && t.category !== 'อาหารเย็น')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const globalBalance = totalIncomeAll - totalGeneralExpenseAll;

  // งบอาหารเย็น (Dinner Budget Logic)
  const DINNER_BUDGET_PER_DAY = 200;
  let dinnerBudgetToShow = 0;
  
  if (viewMode === 'daily') {
    dinnerBudgetToShow = DINNER_BUDGET_PER_DAY;
  } else {
    const isCurrentMonth = todayDate.getMonth() === currentDate.getMonth() && todayDate.getFullYear() === currentDate.getFullYear();
    const isPastMonth = currentDate < new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    
    if (isCurrentMonth) {
      dinnerBudgetToShow = todayDate.getDate() * DINNER_BUDGET_PER_DAY;
    } else if (isPastMonth) {
      dinnerBudgetToShow = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() * DINNER_BUDGET_PER_DAY;
    }
  }

  const periodDinnerSpent = viewTransactions
    .filter(t => t.type === 'expense' && t.category === 'อาหารเย็น')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const dinnerRemaining = dinnerBudgetToShow - periodDinnerSpent;

  const periodIncome = viewTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
  const periodGeneralExpense = viewTransactions
    .filter(t => t.type === 'expense' && t.category !== 'อาหารเย็น')
    .reduce((sum, t) => sum + (t.amount || 0), 0);


  if (loading) {
    return (
      <View style={[styles.container, {justifyContent:'center', alignItems:'center'}]}>
        <ActivityIndicator size="large" color="#109D59" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateText}>{todayDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          <View style={{flexDirection:'row', alignItems:'center', gap: 5}}>
            <Text style={styles.headerTitle}>Money Tracker</Text>
            {isAutoSyncing && <ActivityIndicator size="small" color="#109D59" />}
          </View>
        </View>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButtonSmall}>
          <MaterialCommunityIcons name="plus" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#109D59" />}
      >
        {/* Toggle & Date Nav */}
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

        <View style={styles.dateNavigator}>
          <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navBtn}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#334155" />
          </TouchableOpacity>
          <Text style={styles.navTextMain}>
            {viewMode === 'daily' ? formatThaiDate(currentDate) : formatMonthOnly(currentDate)}
          </Text>
          <TouchableOpacity onPress={() => changeDate(1)} style={styles.navBtn}>
            <MaterialCommunityIcons name="chevron-right" size={28} color="#334155" />
          </TouchableOpacity>
        </View>

        {/* Global Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>ยอดเงินคงเหลือสุทธิ</Text>
          <Text style={styles.balanceAmount}>฿{globalBalance.toLocaleString()}</Text>
          <Text style={{color: '#E0E7FF', fontSize: 10, marginTop: -5}}>* ไม่รวมงบอาหารเย็น</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="arrow-up-circle" size={20} color="#6EE7B7" />
              <View>
                <Text style={styles.statLabel}>รายรับ</Text>
                <Text style={styles.statValueIncome}>+{periodIncome.toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="basket" size={20} color="#FCA5A5" />
              <View>
                <Text style={styles.statLabel}>จ่ายทั่วไป</Text>
                <Text style={styles.statValueExpense}>-{periodGeneralExpense.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Dinner Budget Card (สำคัญ!) */}
        <View style={styles.dinnerCard}>
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
            <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
              <View style={styles.dinnerIconBg}>
                <MaterialCommunityIcons name="food-fork-drink" size={20} color="#F97316" />
              </View>
              <Text style={styles.dinnerTitle}>งบอาหารเย็น</Text>
            </View>
            <Text style={styles.dinnerTargetBadge}>
              เป้า: {dinnerBudgetToShow.toLocaleString()}฿
            </Text>
          </View>
          
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end'}}>
            <View>
              <Text style={{fontSize: 12, color: '#9A3412'}}>ใช้ไป</Text>
              <Text style={{fontSize: 20, fontWeight: 'bold', color: '#C2410C'}}>{periodDinnerSpent.toLocaleString()}</Text>
            </View>
            <View style={{alignItems:'flex-end'}}>
              <Text style={{fontSize: 12, color: '#9A3412'}}>คงเหลือ</Text>
              <Text style={{fontSize: 24, fontWeight: 'bold', color: dinnerRemaining >= 0 ? '#16A34A' : '#DC2626'}}>
                {dinnerRemaining > 0 ? '+' : ''}{dinnerRemaining.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* List */}
        <Text style={styles.sectionTitle}>รายการล่าสุด</Text>
        {viewTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>ไม่มีรายการ</Text>
          </View>
        ) : (
          viewTransactions.map(t => (
            <View key={t.id} style={styles.txItem}>
              <View style={styles.txLeft}>
                <View style={[styles.txIcon, t.type === 'income' ? styles.bgGreen : t.category === 'อาหารเย็น' ? styles.bgOrange : styles.bgRed]}>
                  <MaterialCommunityIcons 
                    name={t.type === 'income' ? "arrow-up" : t.category === 'อาหารเย็น' ? "food" : "basket"} 
                    size={20} 
                    color={t.type === 'income' ? "#059669" : t.category === 'อาหารเย็น' ? "#EA580C" : "#DC2626"} 
                  />
                </View>
                <View>
                  <Text style={styles.txTitle}>{t.title}</Text>
                  <Text style={styles.txCategory}>{t.category} • {new Date(t.date).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}</Text>
                </View>
              </View>
              <Text style={[styles.txAmount, t.type === 'income' ? styles.textGreen : styles.textRed]}>
                {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
              </Text>
            </View>
          ))
        )}
        <View style={{height: 50}} />
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

            {/* Type Switcher */}
            <View style={styles.typeSwitcher}>
              <TouchableOpacity style={[styles.typeBtn, type === 'income' && styles.typeBtnActiveGreen]} onPress={() => setType('income')}>
                <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>รายรับ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, type === 'expense' && styles.typeBtnActiveRed]} onPress={() => setType('expense')}>
                <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>รายจ่าย</Text>
              </TouchableOpacity>
            </View>

            <TextInput style={styles.input} placeholder="จำนวนเงิน" keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <TextInput style={styles.input} placeholder="ชื่อรายการ" value={title} onChangeText={setTitle} />

            <Text style={{marginBottom: 10, color: '#64748B', fontSize: 12}}>เลือกหมวดหมู่</Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20}}>
              {['อาหารทั่วไป', 'อาหารเย็น', 'เดินทาง', 'ช้อปปิ้ง', 'อื่นๆ', 'เงินเดือน', 'โบนัส'].map(c => (
                <TouchableOpacity 
                  key={c} 
                  style={[styles.catChip, category === c && styles.catChipActive, c === 'อาหารเย็น' && category === c && {backgroundColor: '#F97316', borderColor: '#F97316'}]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
              <Text style={styles.saveBtnText}>บันทึก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  dateText: { fontSize: 12, color: '#64748B' },
  addButtonSmall: { backgroundColor: '#109D59', padding: 8, borderRadius: 12 },
  scrollContent: { padding: 20 },
  
  viewModeContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4, marginBottom: 15 },
  viewModeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  viewModeBtnActive: { backgroundColor: '#fff' },
  viewModeText: { color: '#64748B', fontWeight: '600' },
  viewModeTextActive: { color: '#109D59', fontWeight: 'bold' },

  dateNavigator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 10, marginBottom: 15 },
  navBtn: { padding: 5 },
  navTextMain: { fontSize: 16, fontWeight: 'bold', color: '#334155' },

  balanceCard: { backgroundColor: '#109D59', borderRadius: 24, padding: 20, marginBottom: 15 },
  balanceLabel: { color: '#E0E7FF', fontSize: 14 },
  balanceAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginBottom: 15 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 15, marginTop: 10 },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statLabel: { color: '#E0E7FF', fontSize: 10 },
  statValueIncome: { color: '#6EE7B7', fontWeight: 'bold', fontSize: 14 },
  statValueExpense: { color: '#FCA5A5', fontWeight: 'bold', fontSize: 14 },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 10 },

  dinnerCard: { backgroundColor: '#FFF7ED', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FED7AA' },
  dinnerIconBg: { backgroundColor: '#FFEDD5', padding: 6, borderRadius: 10 },
  dinnerTitle: { fontSize: 16, fontWeight: 'bold', color: '#9A3412' },
  dinnerTargetBadge: { fontSize: 10, color: '#F97316', backgroundColor: '#FFEDD5', paddingHorizontal:8, paddingVertical:4, borderRadius:8 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#334155', marginBottom: 10 },
  
  txItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 16, marginBottom: 10 },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIcon: { padding: 10, borderRadius: 12 },
  bgGreen: { backgroundColor: '#ECFDF5' },
  bgRed: { backgroundColor: '#FEF2F2' },
  bgOrange: { backgroundColor: '#FFF7ED' },
  txTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  txCategory: { fontSize: 12, color: '#64748B' },
  txAmount: { fontSize: 16, fontWeight: 'bold' },
  textGreen: { color: '#059669' },
  textRed: { color: '#DC2626' },
  emptyState: { alignItems: 'center', marginTop: 20 },
  emptyText: { color: '#94A3B8' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  input: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12 },
  typeSwitcher: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20 },
  typeBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 10 },
  typeBtnActiveGreen: { backgroundColor: '#10B981' },
  typeBtnActiveRed: { backgroundColor: '#EF4444' },
  typeText: { fontWeight: '600', color: '#64748B' },
  typeTextActive: { color: '#fff' },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  catChipActive: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
  catText: { color: '#64748B', fontSize: 12 },
  catTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#109D59', padding: 16, borderRadius: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
