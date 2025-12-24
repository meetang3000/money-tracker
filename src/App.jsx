import React, { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw } from 'lucide-react'

const GOOGLE_SHEET_URL =
  "https://script.google.com/macros/s/AKfycbzc1jP70TDLEEASbOHK4eeQkt7up8riaUGXJS-ZefUSxRWbLUSueyiGxbT-zkq6FRW4/exec"

const FIXED_PIN = '1622'

export default function App() {
  // 🔐 PIN
  const [pinInput, setPinInput] = useState('')
  const [pinUnlocked, setPinUnlocked] = useState(false)
  const [pinError, setPinError] = useState('')

  // App State
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')

  // ---------- PIN ----------
  const handlePinSubmit = () => {
    if (pinInput === FIXED_PIN) {
      setPinUnlocked(true)
      setPinError('')
    } else {
      setPinError('PIN ไม่ถูกต้อง')
      setPinInput('')
    }
  }

  if (!pinUnlocked) {
    return (
      <div style={{display:'flex',height:'100vh',alignItems:'center',justifyContent:'center'}}>
        <div style={{padding:20,border:'1px solid #ccc',borderRadius:12,width:260}}>
          <h2 style={{textAlign:'center'}}>ใส่ PIN</h2>
          <input
            type="password"
            maxLength={4}
            inputMode="numeric"
            value={pinInput}
            onChange={e => setPinInput(e.target.value.replace(/\D/g,''))}
            style={{width:'100%',fontSize:24,textAlign:'center',margin:'10px 0'}}
          />
          {pinError && <p style={{color:'red',textAlign:'center'}}>{pinError}</p>}
          <button onClick={handlePinSubmit} style={{width:'100%'}}>ยืนยัน</button>
        </div>
      </div>
    )
  }

  // ---------- DATA ----------
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(GOOGLE_SHEET_URL)
      const data = await res.json()
      if (Array.isArray(data)) setTransactions(data)
    } catch (e) {
      console.log(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const addTransaction = async () => {
    if (!title || !amount) return
    const tx = {
      title,
      amount: Number(amount),
      date: new Date().toISOString()
    }
    setTransactions(prev => [tx, ...prev])
    setModalVisible(false)
    setTitle('')
    setAmount('')
    await fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(tx)
    })
  }

  if (loading) return <p>Loading...</p>

  return (
    <div style={{padding:20}}>
      <h1>Money Tracker</h1>

      <button onClick={()=>setModalVisible(true)}>
        <Plus /> เพิ่มรายการ
      </button>

      <ul>
        {transactions.map((t,i)=>(
          <li key={i}>{t.title} - {Number(t.amount).toLocaleString()}</li>
        ))}
      </ul>

      {modalVisible && (
        <div>
          <input placeholder="ชื่อ" value={title} onChange={e=>setTitle(e.target.value)} />
          <input placeholder="จำนวน" type="number" value={amount} onChange={e=>setAmount(e.target.value)} />
          <button onClick={addTransaction}>บันทึก</button>
        </div>
      )}
    </div>
  )
}
