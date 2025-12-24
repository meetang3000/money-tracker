import { useState } from 'react';

const FIXED_PIN = '1622';

export default function PinGate({ children }) {
  const [pinInput, setPinInput] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');

  const submit = () => {
    if (pinInput === FIXED_PIN) {
      setUnlocked(true);
    } else {
      setError('PIN ไม่ถูกต้อง');
      setPinInput('');
    }
  };

  if (!unlocked) {
    return (
      <div style={{display:'flex',height:'100vh',alignItems:'center',justifyContent:'center'}}>
        <div style={{padding:20,border:'1px solid #ccc',borderRadius:12,width:260}}>
          <h2 style={{textAlign:'center'}}>ใส่ PIN</h2>
          <input
            type="password"
            maxLength={4}
            value={pinInput}
            onChange={e => setPinInput(e.target.value.replace(/\D/g,''))}
            style={{width:'100%',fontSize:24,textAlign:'center',margin:'10px 0'}}
          />
          {error && <p style={{color:'red',textAlign:'center'}}>{error}</p>}
          <button onClick={submit} style={{width:'100%'}}>ยืนยัน</button>
        </div>
      </div>
    );
  }

  return children;
}
