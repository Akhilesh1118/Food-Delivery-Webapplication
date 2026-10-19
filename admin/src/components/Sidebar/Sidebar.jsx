import React from 'react'
import './Sidebar.css'
import { assets } from '../../assets/assets'
import { NavLink } from "react-router-dom";

function Sidebar() {
    return (
        <div className='sidebar'>
            <div className="sidebar-options">
                <NavLink to="/dashboard" className="sidebar-option">
                    <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>📊</span>
                    <p>Dashboard</p>
                </NavLink>

                <NavLink to="/list" className="sidebar-option">
                    <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>📖</span>
                    <p>Menu Items</p>
                </NavLink>

                <NavLink to="/add" className="sidebar-option">
                    <img src={assets.add_icon} alt="" />
                    <p>Add Dish</p>
                </NavLink>

                <NavLink to="/orders" className="sidebar-option">
                    <img src={assets.order_icon} alt="" />
                    <p>Live Orders</p>
                </NavLink>

                <NavLink to="/reports" className="sidebar-option">
                    <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>📈</span>
                    <p>Sales Reports</p>
                </NavLink>
            </div>
        </div>
    )
}

export default Sidebar
