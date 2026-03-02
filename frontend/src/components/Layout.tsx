import { useState } from 'react'
import { Layout } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  HomeOutlined,
  SearchOutlined,
  DatabaseOutlined,
  ApiOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  RobotOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'

const { Sider, Content } = Layout

interface AppLayoutProps { children: React.ReactNode }

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: '工作台' },
  { key: '/chat', icon: <RobotOutlined />, label: 'Agent 对话' },
  { key: '/query', icon: <SearchOutlined />, label: '查询工作台' },
  { key: '/templates', icon: <AppstoreOutlined />, label: '模板管理' },
  { key: '/datasources', icon: <DatabaseOutlined />, label: '数据源' },
  { key: '/models', icon: <ApiOutlined />, label: '模型网关' },
  { key: '/logs', icon: <FileTextOutlined />, label: '日志' },
]

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible collapsed={collapsed} onCollapse={setCollapsed} trigger={null}
        width={220} collapsedWidth={68}
        style={{
          background: 'var(--shell-bg)',
          borderRight: '1px solid var(--shell-border)',
          position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
          overflow: 'auto',
          transition: 'all var(--duration-normal) var(--ease-out)',
        }}
      >
        {/* Brand */}
        <div
          onClick={() => navigate('/')}
          style={{
            height: 60, display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 20px', gap: 10,
            borderBottom: '1px solid var(--shell-border)',
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 'var(--radius-md)',
            background: 'var(--gradient)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff',
            fontFamily: 'var(--font-display)', flexShrink: 0,
            boxShadow: 'var(--shadow-blue)',
          }}>
            D
          </div>
          {!collapsed && (
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15,
              color: 'var(--text-primary)', letterSpacing: '-0.02em',
              background: 'var(--gradient)', WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              DataMind
            </span>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {menuItems.map((item, idx) => {
            const active = location.pathname === item.key
            return (
              <div
                key={item.key}
                className={`animate-slide-left delay-${idx + 1}`}
                onClick={() => navigate(item.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: collapsed ? '9px 0' : '9px 14px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  color: active ? 'var(--shell-text-active)' : 'var(--shell-text)',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  fontSize: 13.5, fontWeight: active ? 600 : 400,
                  transition: 'all var(--duration-fast) var(--ease-out)',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--shell-hover)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                {active && (
                  <div style={{
                    position: 'absolute', left: collapsed ? '50%' : 0,
                    transform: collapsed ? 'translateX(-50%)' : 'none',
                    bottom: collapsed ? 0 : 'auto', top: collapsed ? 'auto' : 6,
                    width: collapsed ? 16 : 3, height: collapsed ? 3 : 22,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--gradient)',
                    transition: 'all var(--duration-normal) var(--ease-spring)',
                  }} />
                )}
                <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </div>
            )
          })}
        </nav>

        {/* Collapse */}
        <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '0 8px' }}>
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: collapsed ? 36 : '100%', height: 34, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              color: 'var(--shell-text)', fontSize: 14,
              transition: 'all var(--duration-fast) var(--ease-out)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--shell-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
        </div>
      </Sider>

      <Layout style={{
        marginLeft: collapsed ? 68 : 220,
        transition: 'margin-left var(--duration-normal) var(--ease-out)',
        background: 'var(--surface-ground)', minHeight: '100vh',
      }}>
        <Content style={{ padding: '24px 28px', minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
