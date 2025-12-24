import { useState } from 'react'

export default function MainApp() {
  const [count, setCount] = useState(0)

  return (
    <div style={{padding:40}}>
      <h1>Money Tracker</h1>
      <p>แอปทำงานปกติแล้ว 🎉</p>
      <button onClick={() => setCount(c => c + 1)}>
        ทดลองกด: {count}
      </button>
    </div>
  )
}
