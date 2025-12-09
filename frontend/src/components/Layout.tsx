import { useState } from 'react'
import { Layout, Menu, theme } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  HomeOutlined,
  SearchOutlined,
  DatabaseOutlined,
  ApiOutlined,
  FileTextOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'

const { Header, Sider, Content } = Layout

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '工作台',
    },
    {
      key: '/query',
      icon: <SearchOutlined />,
      label: '查询工作台',
    },
    {
      key: '/templates',
      icon: <AppstoreOutlined />,
      label: '模板管理',
    },
    {
      key: '/datasources',
      icon: <DatabaseOutlined />,
      label: '数据源管理',
    },
    {
      key: '/models',
      icon: <ApiOutlined />,
      label: '模型网关',
    },
    {
      key: '/logs',
      icon: <FileTextOutlined />,
      label: '日志与观测',
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={200}
      >
        <div
          style={{
            height: 64,
            margin: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 'bold',
            color: '#1890ff',
          }}
        >
          {collapsed ? 'DM' : 'DataMind'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0 }}>数据灵析</h2>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
