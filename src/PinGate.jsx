import { useState } from 'react'

const PIN = '1622'

export default function PinGate({ children }) {
  const [value, setValue] = useState('')
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')

  const submit = () => {
    if (value === PIN) {
      setOk(true)
    } else {
      setErr('PIN ไม่ถูกต้อง')
      setValue('')
    }
  }

  if (!ok) {
    return (
      <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{width:260,padding:20,border:'1px solid #ccc',borderRadius:12}}>
          <h2 style={{textAlign:'center'}}>ใส่ PIN</h2>
          <input
            type="password"
            maxLength={4}
            value={value}
            onChange={e => setValue(e.target.value.replace(/\D/g,''))}
            style={{width:'100%',fontSize:24,textAlign:'center',margin:'10px 0'}}
          />
          {err && <p style={{color:'red',textAlign:'center'}}>{err}</p>}
          <button onClick={submit} style={{width:'100%'}}>ยืนยัน</button>
        </div>
      </div>
    )
  }

  return children
}
