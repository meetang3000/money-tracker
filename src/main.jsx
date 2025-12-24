<<<<<<< HEAD
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
=======
import { useState, useEffect, useCallback } from 'react';

// 🔥 hook ทั้งหมดอยู่ที่นี่
export default function MainApp() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    // logic เดิมทั้งหมด
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      {/* UI เดิมทั้งหมด */}
    </div>
  );
}
>>>>>>> 19df201993dbbf79d236812245c8362cc5423f78
