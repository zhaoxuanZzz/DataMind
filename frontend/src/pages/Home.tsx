import { Row, Col, Typography } from 'antd'
import {
  SearchOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  ApiOutlined,
  RobotOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  NodeIndexOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Text } = Typography

const quickActions = [
  {
    title: 'Agent 智能对话',
    desc: '自然语言对话式数据分析，自动生成SQL和图表',
    icon: <RobotOutlined />,
    color: '#e8553d',
    bg: 'linear-gradient(135deg, rgba(232,85,61,0.08), rgba(245,158,11,0.06))',
    path: '/chat',
    primary: true,
  },
  {
    title: '查询工作台',
    desc: '结构化查询构建，多维度数据探索',
    icon: <SearchOutlined />,
    color: '#2563eb',
    bg: 'linear-gradient(135deg, rgba(37,99,235,0.07), rgba(59,130,246,0.04))',
    path: '/query',
  },
  {
    title: '模板管理',
    desc: '创建和复用常用查询模板',
    icon: <AppstoreOutlined />,
    color: '#059669',
    bg: 'linear-gradient(135deg, rgba(5,150,105,0.07), rgba(16,185,129,0.04))',
    path: '/templates',
  },
  {
    title: '数据源管理',
    desc: 'MySQL · PostgreSQL · SQLite · 向量库',
    icon: <DatabaseOutlined />,
    color: '#7c3aed',
    bg: 'linear-gradient(135deg, rgba(124,58,237,0.07), rgba(139,92,246,0.04))',
    path: '/datasources',
  },
  {
    title: '模型网关',
    desc: '多模型路由策略与健康监控',
    icon: <ApiOutlined />,
    color: '#d97706',
    bg: 'linear-gradient(135deg, rgba(217,119,6,0.07), rgba(245,158,11,0.04))',
    path: '/models',
  },
  {
    title: '日志与观测',
    desc: '查询日志、模型调用记录',
    icon: <FileTextOutlined />,
    color: '#0d9488',
    bg: 'linear-gradient(135deg, rgba(13,148,136,0.07), rgba(20,184,166,0.04))',
    path: '/logs',
  },
]

const features = [
  { icon: <ThunderboltOutlined />, title: '意图解析', desc: '自然语言 → 结构化意图', color: '#e8553d' },
  { icon: <BarChartOutlined />, title: '智能图表', desc: '数据特征驱动的可视化推荐', color: '#2563eb' },
  { icon: <NodeIndexOutlined />, title: '多源融合', desc: '关系库 + 向量库混合查询', color: '#7c3aed' },
  { icon: <SafetyCertificateOutlined />, title: '模型路由', desc: '多模型智能选择与容灾', color: '#059669' },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Hero */}
      <div
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-xl)',
          padding: '48px 52px',
          marginBottom: 40,
          overflow: 'hidden',
          background: 'var(--shell-bg)',
          color: '#fff',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 80% 60% at 70% 40%, rgba(232,85,61,0.15), transparent)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
              marginBottom: 12,
            }}
          >
            DataMind
          </div>
          <div
            style={{
              fontSize: 17,
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 300,
              maxWidth: 480,
              lineHeight: 1.7,
            }}
          >
            智能数据分析与可视化编排平台。
            <br />
            用自然语言对话，驱动数据查询与洞察。
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: 48 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-tertiary)',
            marginBottom: 18,
          }}
        >
          快捷入口
        </div>

        <Row gutter={[16, 16]}>
          {quickActions.map((item, idx) => (
            <Col xs={24} sm={12} md={item.primary ? 12 : 8} key={item.path}>
              <div
                className={`animate-fade-in-up delay-${idx + 1}`}
                onClick={() => navigate(item.path)}
                style={{
                  background: 'var(--surface-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: item.primary ? '28px 28px' : '22px 22px',
                  border: `1px solid ${item.primary ? 'rgba(232,85,61,0.18)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'all var(--duration-normal) var(--ease-out)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                  e.currentTarget.style.borderColor = item.color
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = item.primary ? 'rgba(232,85,61,0.18)' : 'var(--border)'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: item.bg,
                    pointerEvents: 'none',
                  }}
                />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div
                    style={{
                      fontSize: 22,
                      color: item.color,
                      marginBottom: 14,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: item.primary ? 18 : 15,
                      color: 'var(--text-primary)',
                      marginBottom: 6,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                    }}
                  >
                    {item.desc}
                  </div>
                </div>
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: 16,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-full)',
                      border: `1px solid ${item.color}22`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: item.color,
                      fontSize: 12,
                    }}
                  >
                    <ArrowRightOutlined />
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>

      {/* Features */}
      <div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-tertiary)',
            marginBottom: 18,
          }}
        >
          核心能力
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
          }}
        >
          {features.map((f, idx) => (
            <div
              key={idx}
              className={`animate-fade-in-up delay-${idx + 1}`}
              style={{
                background: 'var(--surface-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px 18px',
                border: '1px solid var(--border)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: `${f.color}0d`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  color: f.color,
                  margin: '0 auto 10px',
                }}
              >
                {f.icon}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                }}
              >
                {f.title}
              </div>
              <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.desc}</Text>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
