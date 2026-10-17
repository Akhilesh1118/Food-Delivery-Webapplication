import React, { useState } from 'react'
import './LoginPopup.css'
import { assets } from '../../assets/assets'
import { StoreContext } from '../../context/StoreContext'
import { useContext } from 'react'
import axios from "axios"

const LoginPopup = ({setShowLogin}) => {

    const {url,setToken} = useContext(StoreContext)

    const [currState, setCurrState] = useState("Login");
    const [errorMsg, setErrorMsg] = useState("");
    const [data,setData] = useState({
        name:"",
        email:"",
        password:""
    })

    const onChangeHandler = (event) => {
        const name = event.target.name
        const value = event.target.value
        setData(data=>({...data,[name]:value}))
        setErrorMsg("")
    }

    const onLogin = async (event) =>{
        event.preventDefault()
        setErrorMsg("")
        let newUrl = url ;
        if(currState==="Login"){
            newUrl +="/api/user/login" 
        }else{
            newUrl += "/api/user/register"
        }
           
        try {
            const response = await axios.post(newUrl,data);

            if(response.data.success){
                const user = response.data.user;
                const role = user?.role || "customer";
                setToken(response.data.token);
                localStorage.setItem("token",response.data.token);
                setShowLogin(false);

                if (role === "admin") {
                  localStorage.setItem("admin_token", response.data.token);
                  localStorage.setItem("admin_user", JSON.stringify(user));
                  window.location.href = "/admin/dashboard";
                  return;
                } else if (role === "staff") {
                  localStorage.setItem("staff_token", response.data.token);
                  localStorage.setItem("staff_user", JSON.stringify(user));
                  window.location.href = "/staff/dashboard";
                  return;
                }
            }
            else{
                setErrorMsg(response.data.message || "Authentication failed")
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || err.message || "Request failed")
        }
    }

  return (
    <div className='login-popup'>
    <form onSubmit={onLogin} className="login-popup-container">
        <div className="login-popup-title">
            <h2>{currState}</h2>
            <img onClick={()=>setShowLogin(false) } src={assets.cross_icon} alt="" />
        </div>
        {errorMsg && (
            <div style={{ color: "#e63946", fontSize: "13px", padding: "8px 12px", background: "#fde8e8", borderRadius: "4px" }}>
                {errorMsg}
            </div>
        )}
        <div className="login-popup-inputs">
            {currState==="Login"?<></>:<input name='name' onChange={onChangeHandler} value={data.name} type="text" placeholder='Your name ' required />}
            <input name='email' onChange={onChangeHandler} value={data.email} type="email" placeholder='Email address' required />
            <input name='password' onChange={onChangeHandler} value={data.password} type="password" placeholder='Password' required />
        </div>
        <button type='submit'>{currState==="Sign Up"?"Create account":"Login"}</button>
        <div className="login-popup-condition">
            <input type="checkbox" required />
            <p>By continuing , I agree to the Terms of Service and Privacy Policy</p>
        </div>
        {currState==="Login"
        ?<p>Create a new account? <span onClick={()=> { setCurrState("Sign Up"); setErrorMsg(""); }}>Click here</span></p>
        :<p>Already have an account? <span onClick={()=> { setCurrState("Login"); setErrorMsg(""); }}>Login here</span></p>
        }
        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
            <span>Staff / Admin Portals:</span>
            <div style={{ display: 'flex', gap: '12px' }}>
                <a href="/staff/login" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>Staff POS ➔</a>
                <a href="/admin/login" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>Admin ➔</a>
            </div>
        </div>
    </form>
    </div>
  )
}
export default LoginPopup
