import { Card, Row, Col, Button, Typography, Space, Divider } from 'antd'
import {
  SearchOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph, Text } = Typography

export default function Home() {
  const navigate = useNavigate()

  const quickActions = [
    {
      title: '查询工作台',
      description: '使用自然语言进行数据查询和分析，支持多种图表展示',
      icon: <SearchOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      action: () => navigate('/query'),
      buttonText: '开始查询',
      buttonType: 'primary' as const,
    },
    {
      title: '模板管理',
      description: '创建和管理查询模板，快速复用常用查询场景',
      icon: <AppstoreOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      action: () => navigate('/templates'),
      buttonText: '管理模板',
      buttonType: 'default' as const,
    },
    {
      title: '数据源管理',
      description: '配置和管理MySQL、PostgreSQL、ChromaDB、Milvus等数据源',
      icon: <DatabaseOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
      action: () => navigate('/datasources'),
      buttonText: '管理数据源',
      buttonType: 'default' as const,
    },
    {
      title: '模型网关',
      description: '配置AI模型路由策略，管理阿里云/豆包/Kimi/OpenAI等模型',
      icon: <ApiOutlined style={{ fontSize: 32, color: '#fa8c16' }} />,
      action: () => navigate('/models'),
      buttonText: '配置模型',
      buttonType: 'default' as const,
    },
    {
      title: '日志与观测',
      description: '查看查询日志、模型调用记录和系统运行状态',
      icon: <FileTextOutlined style={{ fontSize: 32, color: '#13c2c2' }} />,
      action: () => navigate('/logs'),
      buttonText: '查看日志',
      buttonType: 'default' as const,
    },
  ]

  return (
    <div>
      {/* 欢迎区域 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 12,
          padding: '32px 40px',
          marginBottom: 24,
          color: '#fff',
        }}
      >
        <Space align="center" size={16}>
          <RocketOutlined style={{ fontSize: 48 }} />
          <div>
            <Title level={2} style={{ color: '#fff', margin: 0 }}>
              欢迎使用 DataMind 数据灵析
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.85)', margin: '8px 0 0 0', fontSize: 16 }}>
              智能化数据分析与可视化编排工具，面向多业务场景的查询与洞察
            </Paragraph>
          </div>
        </Space>
      </div>

      {/* 快捷入口 */}
      <div style={{ marginBottom: 16 }}>
        <Space align="center">
          <ThunderboltOutlined style={{ color: '#faad14' }} />
          <Text strong style={{ fontSize: 16 }}>
            快捷入口
          </Text>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {quickActions.map((item, index) => (
          <Col xs={24} sm={12} md={8} lg={index < 2 ? 12 : 8} key={item.title}>
            <Card
              hoverable
              style={{
                height: '100%',
                borderRadius: 8,
                transition: 'all 0.3s',
              }}
              bodyStyle={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}
            >
              <div style={{ marginBottom: 16 }}>{item.icon}</div>
              <Title level={4} style={{ marginBottom: 8 }}>
                {item.title}
              </Title>
              <Paragraph
                type="secondary"
                style={{ flex: 1, marginBottom: 16 }}
              >
                {item.description}
              </Paragraph>
              <Button
                type={item.buttonType}
                onClick={item.action}
                block
              >
                {item.buttonText}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 功能特性 */}
      <Divider />
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 16 }}>
          核心能力
        </Text>
      </div>
      <Row gutter={[24, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 8 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🧠</div>
            <Text strong>智能意图识别</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                自动理解查询意图
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 8 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
            <Text strong>可视化推荐</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                智能推荐最佳图表
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 8 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔗</div>
            <Text strong>多源融合</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                关系库+向量库混合查询
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 8 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🤖</div>
            <Text strong>多模型路由</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                智能选择最优模型
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
