import { useState, useContext }               from 'react'
import { NavLink, useNavigate, useLocation }  from 'react-router-dom'
import { AuthContext }                        from '../context/AuthContext.jsx'
import { logoutApi }                          from '../api/auth.api.js'
import { TbBox, TbHistory, TbLogout, TbQrcode, TbLayoutDashboard, TbUsers, TbPackage, TbClipboardList, TbShieldCheck, TbFileText, TbChecklist, TbMessageCircle } from 'react-icons/tb'
import { PiHouseFill }                        from 'react-icons/pi'
import { FiChevronRight, FiChevronLeft, FiUser } from 'react-icons/fi'

const EXPANDED = 230
const COLLAPSED = 72

export default function Navbar() {
  const { user, setUser } = useContext(AuthContext)
  const navigate           = useNavigate()
  const location           = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [hoveredItem, setHoveredItem] = useState(null)
  const [hoveredLogout, setHoveredLogout] = useState(false)
  const [hoveredToggle, setHoveredToggle] = useState(false)

  if (location.pathname === '/login' || location.pathname === '/face') return null

  const handleLogout = async () => {
    try { await logoutApi() } catch { /* ignore */ }
    setUser(null)
    navigate('/login')
  }

  const width = collapsed ? COLLAPSED : EXPANDED

  const navItems = [
    { to: '/', label: 'Homepage', icon: <PiHouseFill size={20} />, end: true },
    ...(user?.role === 'student'
      ? [{ to: '/items', label: 'QR Scan', icon: <TbQrcode size={20} />, end: false }]
      : []),
    ...(user?.role === 'admin'
      ? [
          { to: '/admin/dashboard',    label: 'Dashboard',    icon: <TbLayoutDashboard size={20} />, end: false },
          { to: '/admin/classes',      label: 'Classes',      icon: <TbUsers size={20} />,           end: false },
          { to: '/admin/inventory',    label: 'Inventory',    icon: <TbPackage size={20} />,         end: false },
          { to: '/admin/reservations', label: 'Reservations', icon: <TbClipboardList size={20} />,  end: false },
          { to: '/admin/verification', label: 'Verification', icon: <TbShieldCheck size={20} />,    end: false },
          { to: '/admin/logs',         label: 'Logs',         icon: <TbFileText size={20} />,       end: false },
          { to: '/admin/checklist',    label: 'Checklist',    icon: <TbChecklist size={20} />,      end: false },
          { to: '/admin/feedback',     label: 'Feedback',     icon: <TbMessageCircle size={20} />,  end: false },
        ]
      : []),
    ...(user
      ? [{ to: '/history', label: 'History', icon: <TbHistory size={20} />, end: false }]
      : []),
  ]

  return (
    <div style={{
      position:   'relative',
      width:      `${width}px`,
      minWidth:   `${width}px`,
      height:     '100vh',
      flexShrink: 0,
      transition: 'width 0.25s ease, min-width 0.25s ease',
    }}>
      {/* Sidebar panel */}
      <nav style={{
        width:           '100%',
        height:          '100%',
        backgroundColor: '#000',
        display:         'flex',
        flexDirection:   'column',
        padding:         '20px 0 20px',
        overflow:        'hidden',
      }}>

        {/* Logo / title */}
        <div style={{
          display:       'flex',
          alignItems:    'center',
          gap:           '10px',
          padding:       '0 16px',
          marginBottom:  '48px',
          cursor:        'pointer',
        }} onClick={() => navigate('/')}>
          <div style={{
            width:           '38px',
            height:          '38px',
            minWidth:        '38px',
            backgroundColor: '#fff',
            borderRadius:    '10px',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
          }}>
            <TbBox size={22} color="#000" />
          </div>
          {!collapsed && (
            <span style={{
              color:      '#fff',
              fontSize:   '13px',
              fontWeight: 700,
              lineHeight: 1.4,
              whiteSpace: 'normal',
            }}>
              Asia Vietnam lab management system
            </span>
          )}
        </div>

        {/* Nav items */}
        <div style={{
          display:       'flex',
          flexDirection: 'column',
          gap:           '10px',
          padding:       '0 12px',
          flex:          1,
          overflowY:     'auto',
        }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onMouseEnter={() => setHoveredItem(item.to)}
              onMouseLeave={() => setHoveredItem(null)}
              style={({ isActive }) => ({
                display:         'flex',
                alignItems:      'center',
                justifyContent:  collapsed ? 'center' : 'flex-start',
                gap:             collapsed ? 0 : '10px',
                padding:         collapsed ? '12px 0' : '12px 20px',
                backgroundColor: isActive
                  ? '#b91c1c'
                  : hoveredItem === item.to ? '#b91c1c' : '#dc2626',
                color:           '#fff',
                textDecoration:  'none',
                borderRadius:    '999px',
                fontWeight:      700,
                fontSize:        '14px',
                whiteSpace:      'nowrap',
                transform:       hoveredItem === item.to ? 'scale(1.03)' : 'scale(1)',
                transition:      'background-color 0.18s ease, transform 0.18s ease',
              })}
            >
              {item.icon}
              {!collapsed && item.label}
            </NavLink>
          ))}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #4b5563', margin: '16px 12px' }} />

        {/* User info + logout */}
        <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width:           '44px',
              height:          '44px',
              minWidth:        '44px',
              borderRadius:    '50%',
              backgroundColor: '#6b7280',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              flexShrink:      0,
            }}>
              <FiUser size={20} color="#fff" />
            </div>
            {!collapsed && (
              <div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap' }}>
                  {user?.name || user?.id || 'User'}
                </div>
                <div style={{ color: '#9ca3af', fontSize: '12px', textTransform: 'uppercase' }}>
                  {user?.role || 'USER'}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            onMouseEnter={() => setHoveredLogout(true)}
            onMouseLeave={() => setHoveredLogout(false)}
            style={{
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              gap:             '8px',
              backgroundColor: hoveredLogout ? 'rgba(255,255,255,0.12)' : 'transparent',
              border:          '1.5px solid #fff',
              borderRadius:    '999px',
              color:           '#fff',
              padding:         '10px 0',
              fontWeight:      600,
              fontSize:        '14px',
              cursor:          'pointer',
              width:           '100%',
              whiteSpace:      'nowrap',
              transition:      'background-color 0.18s ease',
            }}
          >
            <TbLogout size={18} />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </nav>

      {/* Collapse toggle button — floats on right edge */}
      <button
        onClick={() => setCollapsed(c => !c)}
        onMouseEnter={() => setHoveredToggle(true)}
        onMouseLeave={() => setHoveredToggle(false)}
        style={{
          position:        'absolute',
          top:             '50%',
          right:           '-14px',
          transform:       hoveredToggle ? 'translateY(-50%) scale(1.15)' : 'translateY(-50%) scale(1)',
          width:           '28px',
          height:          '28px',
          borderRadius:    '50%',
          backgroundColor: '#fff',
          border:          'none',
          cursor:          'pointer',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          boxShadow:       hoveredToggle ? '0 4px 12px rgba(0,0,0,0.5)' : '0 2px 6px rgba(0,0,0,0.35)',
          zIndex:          20,
          transition:      'transform 0.18s ease, box-shadow 0.18s ease',
        }}
      >
        {collapsed
          ? <FiChevronRight size={14} color="#000" />
          : <FiChevronLeft  size={14} color="#000" />}
      </button>
    </div>
  )
}
