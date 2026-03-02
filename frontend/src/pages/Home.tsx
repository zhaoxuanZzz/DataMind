import { Row, Col } from 'antd'
import {
  SearchOutlined, DatabaseOutlined, FileTextOutlined,
  AppstoreOutlined, ApiOutlined, RobotOutlined,
  ArrowRightOutlined, ThunderboltOutlined, BarChartOutlined,
  NodeIndexOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const actions = [
  { title: 'Agent 智能对话', desc: '自然语言对话式数据分析', icon: <RobotOutlined />, path: '/chat', primary: true },
  { title: '查询工作台', desc: '结构化查询构建', icon: <SearchOutlined />, path: '/query' },
  { title: '模板管理', desc: '常用查询模板复用', icon: <AppstoreOutlined />, path: '/templates' },
  { title: '数据源管理', desc: 'MySQL · PostgreSQL · SQLite', icon: <DatabaseOutlined />, path: '/datasources' },
  { title: '模型网关', desc: '多模型路由与监控', icon: <ApiOutlined />, path: '/models' },
  { title: '日志与观测', desc: '查询与调用日志', icon: <FileTextOutlined />, path: '/logs' },
]

const features = [
  { icon: <ThunderboltOutlined />, title: '意图解析', desc: '自然语言→结构化意图' },
  { icon: <BarChartOutlined />, title: '智能图表', desc: '数据驱动可视化推荐' },
  { icon: <NodeIndexOutlined />, title: '多源融合', desc: '关系库+向量库混合查询' },
  { icon: <SafetyCertificateOutlined />, title: '模型路由', desc: '多模型智能选择容灾' },
]

export default function Home() {
  const navigate = useNavigate()
  return (
    <div className="animate-fade-in-up" style={{ maxWidth: 1060, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{
        borderRadius: 'var(--radius-xl)', padding: '44px 48px', marginBottom: 36,
        background: 'var(--gradient-vivid)', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 260, height: 260,
          borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: '30%', width: 180, height: 180,
          borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700,
            color: '#fff', letterSpacing: '-0.03em', marginBottom: 8,
          }}>
            DataMind
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: 300, lineHeight: 1.8, maxWidth: 420 }}>
            智能数据分析平台 —— 自然语言驱动查询与洞察
          </p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginBottom: 44 }}>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          color: 'var(--text-tertiary)', marginBottom: 14,
        }}>快捷入口</p>
        <Row gutter={[14, 14]}>
          {actions.map((a, i) => (
            <Col xs={24} sm={12} md={a.primary ? 12 : 8} key={a.path}>
              <div
                className={`animate-fade-in-up delay-${i + 1}`}
                onClick={() => navigate(a.path)}
                style={{
                  background: '#fff', borderRadius: 'var(--radius-lg)',
                  padding: '22px 22px 18px', cursor: 'pointer',
                  border: a.primary ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  transition: 'all var(--duration-normal) var(--ease-out)',
                  height: '100%', display: 'flex', flexDirection: 'column',
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = a.primary ? 'var(--shadow-blue)' : 'var(--shadow-md)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {a.primary && <div style={{
                  position: 'absolute', inset: 0,
                  background: 'var(--gradient-light)', pointerEvents: 'none',
                }} />}
                <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                    background: a.primary ? 'var(--gradient)' : 'var(--accent-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: a.primary ? '#fff' : 'var(--accent)',
                    marginBottom: 14, boxShadow: a.primary ? 'var(--shadow-blue)' : 'none',
                  }}>{a.icon}</div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontWeight: 600,
                    fontSize: a.primary ? 17 : 14, marginBottom: 4,
                    color: 'var(--text-primary)', letterSpacing: '-0.01em',
                  }}>{a.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.desc}</div>
                </div>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                  <ArrowRightOutlined style={{ fontSize: 12, color: 'var(--accent)' }} />
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>

      {/* Features */}
      <div>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          color: 'var(--text-tertiary)', marginBottom: 14,
        }}>核心能力</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {features.map((f, i) => (
            <div key={i} className={`animate-fade-in-up delay-${i + 1}`} style={{
              background: '#fff', borderRadius: 'var(--radius-lg)',
              padding: '20px 16px', border: '1px solid var(--border)',
              textAlign: 'center',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 'var(--radius-md)',
                background: 'var(--gradient-light)', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 17, color: 'var(--accent)', marginBottom: 10,
              }}>{f.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{f.title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
