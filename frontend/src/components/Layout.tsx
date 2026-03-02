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

interface AppLayoutProps {
  children: React.ReactNode
}

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: '工作台' },
  { key: '/chat', icon: <RobotOutlined />, label: 'Agent 对话' },
  { key: '/query', icon: <SearchOutlined />, label: '查询工作台' },
  { key: '/templates', icon: <AppstoreOutlined />, label: '模板管理' },
  { key: '/datasources', icon: <DatabaseOutlined />, label: '数据源管理' },
  { key: '/models', icon: <ApiOutlined />, label: '模型网关' },
  { key: '/logs', icon: <FileTextOutlined />, label: '日志与观测' },
]

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ── Sidebar ───────────────────────────────── */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={230}
        collapsedWidth={72}
        style={{
          background: 'var(--shell-bg)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          overflow: 'auto',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        {/* Brand */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            gap: 10,
            cursor: 'pointer',
            transition: 'all var(--duration-normal) var(--ease-out)',
          }}
          onClick={() => navigate('/')}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent) 0%, #f59e0b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 700,
              color: '#fff',
              fontFamily: 'var(--font-display)',
              flexShrink: 0,
            }}
          >
            D
          </div>
          {!collapsed && (
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 16,
                color: 'var(--shell-text-active)',
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              DataMind
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.key
            return (
              <div
                key={item.key}
                onClick={() => navigate(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: collapsed ? '10px 0' : '10px 16px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  color: isActive ? 'var(--shell-text-active)' : 'var(--shell-text)',
                  background: isActive ? 'rgba(232, 85, 61, 0.12)' : 'transparent',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: 'var(--font-body)',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--shell-hover)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: collapsed ? '50%' : 0,
                      transform: collapsed ? 'translateX(-50%)' : 'none',
                      bottom: collapsed ? 2 : 'auto',
                      top: collapsed ? 'auto' : 8,
                      width: collapsed ? 18 : 3,
                      height: collapsed ? 3 : 20,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--accent)',
                    }}
                  />
                )}
                <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </div>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            padding: '0 8px',
          }}
        >
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: collapsed ? 40 : '100%',
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              color: 'var(--shell-text)',
              fontSize: 15,
              transition: 'all var(--duration-fast) var(--ease-out)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--shell-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
        </div>
      </Sider>

      {/* ── Main Content ──────────────────────────── */}
      <Layout
        style={{
          marginLeft: collapsed ? 72 : 230,
          transition: 'margin-left var(--duration-normal) var(--ease-out)',
          background: 'var(--surface-ground)',
          minHeight: '100vh',
        }}
      >
        <Content
          style={{
            padding: '28px 32px',
            minHeight: 280,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
