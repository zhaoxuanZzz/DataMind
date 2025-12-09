import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ApiOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { modelService } from '../services/model'
import {
  ModelCallLog,
  ModelConfig,
  ModelConfigCreate,
  ModelConfigUpdate,
  ModelGatewayStats,
  ModelProvider,
  ModelPurpose,
  ModelRouteStrategy,
  ModelRouteStrategyCreate,
  ModelRouteStrategyUpdate,
} from '../types'

const { Title, Text } = Typography
const { Option } = Select

const providerLabel: Record<ModelProvider, string> = {
  [ModelProvider.ALIYUN]: '阿里云',
  [ModelProvider.DOUBAO]: '豆包',
  [ModelProvider.KIMI]: 'Kimi',
  [ModelProvider.OPENAI]: 'OpenAI',
}

const purposeLabel: Record<ModelPurpose, string> = {
  [ModelPurpose.INTENT]: '意图',
  [ModelPurpose.SQL]: 'SQL',
  [ModelPurpose.SUMMARY]: '总结',
  [ModelPurpose.EMBEDDING]: 'Embedding',
}

function formatPercent(val?: number | null) {
  if (val === undefined || val === null) return '-'
  return `${(val * 100).toFixed(1)}%`
}

function formatLatency(val?: number | null) {
  if (val === undefined || val === null) return '-'
  return `${val.toFixed(1)} ms`
}

function formatQuota(qps?: number, daily?: number | null) {
  const qpsText = qps ? `${qps}/s` : '-'
  const dailyText = daily || daily === 0 ? `${daily}/day` : '-'
  return `${qpsText} / ${dailyText}`
}

export default function ModelGateway() {
  const [loading, setLoading] = useState(false)
  const [configs, setConfigs] = useState<ModelConfig[]>([])
  const [routes, setRoutes] = useState<ModelRouteStrategy[]>([])
  const [logs, setLogs] = useState<ModelCallLog[]>([])
  const [stats, setStats] = useState<ModelGatewayStats>()
  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [routeModalVisible, setRouteModalVisible] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ModelConfig | null>(null)
  const [editingRoute, setEditingRoute] = useState<ModelRouteStrategy | null>(null)
  const [configForm] = Form.useForm()
  const [routeForm] = Form.useForm()

  const loadAll = async () => {
    setLoading(true)
    try {
      const [cfgs, rts, st, lg] = await Promise.all([
        modelService.listConfigs(),
        modelService.listRoutes(),
        modelService.getStats(),
        modelService.listLogs({ limit: 20 }),
      ])
      setConfigs(cfgs)
      setRoutes(rts)
      setStats(st)
      setLogs(lg)
    } catch (err: any) {
      message.error(err?.message || '加载模型网关数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const providerStats = useMemo(() => {
    if (stats?.providers?.length) return stats.providers
    // 兜底：仅依据配置列表计算数量
    const grouped = configs.reduce<Record<string, { count: number }>>((acc, cur) => {
      acc[cur.provider] = acc[cur.provider] || { count: 0 }
      acc[cur.provider].count += 1
      return acc
    }, {})
    return Object.entries(grouped).map(([provider, val]) => ({
      provider: provider as ModelProvider,
      total_models: val.count,
      total_calls: 0,
      success_rate: null,
      avg_latency_ms: null,
      health_status: 'unknown',
    }))
  }, [configs, stats])

  const openConfigModal = (config?: ModelConfig) => {
    setEditingConfig(config || null)
    setConfigModalVisible(true)
    if (config) {
      configForm.setFieldsValue({
        provider: config.provider,
        model_name: config.model_name,
        purpose: config.purpose,
        api_key_ref: config.api_key_ref,
        endpoint: config.endpoint,
        qps_limit: config.qps_limit,
        daily_quota: config.daily_quota ?? undefined,
        cost_metric: config.cost_metric ?? undefined,
      })
    } else {
      configForm.resetFields()
    }
  }

  const openRouteModal = (route?: ModelRouteStrategy) => {
    setEditingRoute(route || null)
    setRouteModalVisible(true)
    if (route) {
      routeForm.setFieldsValue({
        scenario: route.scenario,
        primary_model_id: route.primary_model_id,
        fallback_model_ids: route.fallback_model_ids,
        rules: JSON.stringify(route.rules || {}, null, 2),
      })
    } else {
      routeForm.resetFields()
      routeForm.setFieldsValue({ rules: '{}' })
    }
  }

  const handleSaveConfig = async () => {
    try {
      const values = await configForm.validateFields()
      const payload: ModelConfigCreate = {
        provider: values.provider,
        model_name: values.model_name,
        purpose: values.purpose,
        api_key_ref: values.api_key_ref,
        endpoint: values.endpoint,
        qps_limit: values.qps_limit ? Number(values.qps_limit) : 0,
        daily_quota: values.daily_quota ? Number(values.daily_quota) : undefined,
        cost_metric: values.cost_metric ? Number(values.cost_metric) : undefined,
      }
      if (editingConfig) {
        const updatePayload: ModelConfigUpdate = {
          ...payload,
        }
        await modelService.updateConfig(editingConfig.id, updatePayload)
        message.success('模型配置已更新')
      } else {
        await modelService.createConfig(payload)
        message.success('模型配置已创建')
      }
      setConfigModalVisible(false)
      setEditingConfig(null)
      loadAll()
    } catch (err: any) {
      if (err?.errorFields) return
      message.error(err?.message || '保存模型配置失败')
    }
  }

  const handleDeleteConfig = (id: number) => {
    Modal.confirm({
      title: '确认删除模型配置？',
      onOk: async () => {
        try {
          await modelService.deleteConfig(id)
          message.success('删除成功')
          loadAll()
        } catch (err: any) {
          message.error(err?.message || '删除失败')
        }
      },
    })
  }

  const handleSaveRoute = async () => {
    try {
      const values = await routeForm.validateFields()
      let rulesObj: Record<string, any> = {}
      if (values.rules) {
        try {
          rulesObj = JSON.parse(values.rules)
        } catch (parseErr) {
          message.error('路由规则必须是合法的 JSON')
          return
        }
      }

      const payload: ModelRouteStrategyCreate = {
        scenario: values.scenario,
        primary_model_id: values.primary_model_id,
        fallback_model_ids: values.fallback_model_ids || [],
        rules: rulesObj,
      }

      if (editingRoute) {
        const updatePayload: ModelRouteStrategyUpdate = { ...payload }
        await modelService.updateRoute(editingRoute.id, updatePayload)
        message.success('路由策略已更新')
      } else {
        await modelService.createRoute(payload)
        message.success('路由策略已创建')
      }
      setRouteModalVisible(false)
      setEditingRoute(null)
      loadAll()
    } catch (err: any) {
      if (err?.errorFields) return
      message.error(err?.message || '保存路由策略失败')
    }
  }

  const handleDeleteRoute = (id: number) => {
    Modal.confirm({
      title: '确认删除路由策略？',
      onOk: async () => {
        try {
          await modelService.deleteRoute(id)
          message.success('删除成功')
          loadAll()
        } catch (err: any) {
          message.error(err?.message || '删除失败')
        }
      },
    })
  }

  const configColumns = [
    {
      title: '提供商',
      dataIndex: 'provider',
      key: 'provider',
      render: (provider: ModelProvider) => <Tag>{providerLabel[provider] || provider}</Tag>,
    },
    {
      title: '模型名称',
      dataIndex: 'model_name',
      key: 'model_name',
    },
    {
      title: '用途',
      dataIndex: 'purpose',
      key: 'purpose',
      render: (purpose: ModelPurpose[]) =>
        purpose && purpose.length
          ? purpose.map((p) => (
              <Tag color="geekblue" key={p}>
                {purposeLabel[p] || p}
              </Tag>
            ))
          : '-',
    },
    {
      title: 'QPS/日配额',
      key: 'quota',
      render: (_: any, record: ModelConfig) => formatQuota(record.qps_limit, record.daily_quota),
    },
    {
      title: '成功率',
      dataIndex: 'success_rate',
      key: 'success_rate',
      render: (rate: number | null | undefined) => formatPercent(rate),
    },
    {
      title: '平均延迟',
      dataIndex: 'avg_latency_ms',
      key: 'avg_latency_ms',
      render: (latency: number | null | undefined) => formatLatency(latency),
    },
    {
      title: 'P95',
      dataIndex: 'p95_latency_ms',
      key: 'p95_latency_ms',
      render: (latency: number | null | undefined) => formatLatency(latency),
    },
    {
      title: '状态',
      dataIndex: 'health_status',
      key: 'health_status',
      render: (status: string) => {
        const color =
          status === 'healthy' ? 'green' : status === 'unhealthy' ? 'red' : 'default'
        return <Tag color={color}>{status}</Tag>
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: ModelConfig) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openConfigModal(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteConfig(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const routeColumns = [
    {
      title: '场景',
      dataIndex: 'scenario',
      key: 'scenario',
    },
    {
      title: '主模型',
      dataIndex: 'primary_model_id',
      key: 'primary_model_id',
      render: (id: number) => configs.find((c) => c.id === id)?.model_name || `#${id}`,
    },
    {
      title: '备选模型',
      dataIndex: 'fallback_model_ids',
      key: 'fallback_model_ids',
      render: (ids: number[]) =>
        ids && ids.length
          ? ids.map((id) => (
              <Tag key={id}>{configs.find((c) => c.id === id)?.model_name || `#${id}`}</Tag>
            ))
          : '-',
    },
    {
      title: '规则',
      dataIndex: 'rules',
      key: 'rules',
      render: (rules: Record<string, any>) =>
        rules && Object.keys(rules).length ? (
          <Text ellipsis style={{ maxWidth: 200 }} title={JSON.stringify(rules)}>
            {JSON.stringify(rules)}
          </Text>
        ) : (
          '-'
        ),
    },
    {
      title: '状态',
      dataIndex: 'health_status',
      key: 'health_status',
      render: (status: string) => {
        const color =
          status === 'healthy' ? 'green' : status === 'unhealthy' ? 'red' : 'default'
        return <Tag color={color}>{status}</Tag>
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: ModelRouteStrategy) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openRouteModal(record)}>
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteRoute(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const logColumns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t: string) => new Date(t).toLocaleString(),
    },
    {
      title: '场景',
      dataIndex: 'scenario',
      key: 'scenario',
    },
    {
      title: '模型',
      dataIndex: 'model_id',
      key: 'model_id',
      render: (id: number) => configs.find((c) => c.id === id)?.model_name || `#${id}`,
    },
    {
      title: '延迟',
      dataIndex: 'latency_ms',
      key: 'latency_ms',
      render: (latency: number) => formatLatency(latency),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'success' ? 'green' : 'red'
        return <Tag color={color}>{status}</Tag>
      },
    },
    {
      title: '错误类型',
      dataIndex: 'error_type',
      key: 'error_type',
      render: (err: string) => err || '-',
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>
          模型网关
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadAll}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openConfigModal()}>
            新增模型
          </Button>
          <Button icon={<ApiOutlined />} onClick={() => openRouteModal()}>
            新增路由
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {providerStats.map((p) => (
          <Col span={6} key={p.provider}>
            <Card>
              <Space align="start">
                <SafetyCertificateOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                <div>
                  <div style={{ fontWeight: 600 }}>{providerLabel[p.provider] || p.provider}</div>
                  <div style={{ color: '#999' }}>健康度：{p.health_status}</div>
                </div>
              </Space>
              <Divider style={{ margin: '12px 0' }} />
              <Row gutter={12}>
                <Col span={12}>
                  <Statistic title="模型数" value={p.total_models} />
                </Col>
                <Col span={12}>
                  <Statistic title="成功率" value={p.success_rate ? formatPercent(p.success_rate) : '-'} />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="平均延迟"
                    value={p.avg_latency_ms ? `${p.avg_latency_ms.toFixed(1)} ms` : '-'}
                  />
                </Col>
                <Col span={12}>
                  <Statistic title="调用量" value={p.total_calls} />
                </Col>
              </Row>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title="模型列表"
        extra={
          <Space>
            <Button type="link" onClick={() => openConfigModal()} icon={<PlusOutlined />}>
              新增
            </Button>
          </Space>
        }
        loading={loading}
      >
        <Table<ModelConfig>
          columns={configColumns}
          dataSource={configs}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Divider />

      <Card
        title="路由策略"
        extra={
          <Button type="link" onClick={() => openRouteModal()} icon={<PlusOutlined />}>
            新增路由
          </Button>
        }
        loading={loading}
        style={{ marginTop: 16 }}
      >
        <Table<ModelRouteStrategy>
          columns={routeColumns}
          dataSource={routes}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Divider />

      <Card title="最近模型调用" loading={loading} style={{ marginTop: 16 }}>
        {logs.length === 0 ? (
          <Alert message="暂无调用记录" type="info" />
        ) : (
          <Table<ModelCallLog>
            columns={logColumns}
            dataSource={logs}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      <Modal
        title={editingConfig ? '编辑模型配置' : '新增模型配置'}
        open={configModalVisible}
        onOk={handleSaveConfig}
        onCancel={() => setConfigModalVisible(false)}
        width={640}
      >
        <Form form={configForm} layout="vertical">
          <Form.Item name="provider" label="提供商" rules={[{ required: true }]}>
            <Select placeholder="选择模型提供商">
              <Option value={ModelProvider.ALIYUN}>阿里云</Option>
              <Option value={ModelProvider.DOUBAO}>豆包</Option>
              <Option value={ModelProvider.KIMI}>Kimi</Option>
              <Option value={ModelProvider.OPENAI}>OpenAI</Option>
            </Select>
          </Form.Item>
          <Form.Item name="model_name" label="模型名称" rules={[{ required: true }]}>
            <Input placeholder="例如：gpt-4o, qwen-max 等" />
          </Form.Item>
          <Form.Item name="purpose" label="用途" rules={[{ required: true }]}>
            <Select placeholder="选择用途" mode="multiple">
              <Option value={ModelPurpose.INTENT}>意图</Option>
              <Option value={ModelPurpose.SQL}>SQL生成</Option>
              <Option value={ModelPurpose.SUMMARY}>总结</Option>
              <Option value={ModelPurpose.EMBEDDING}>Embedding</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="api_key_ref"
            label="API Key 引用"
            tooltip="填写环境变量名或引用标识，后端会读取对应的密钥"
            rules={[{ required: true }]}
          >
            <Input placeholder="例如：OPENAI_API_KEY 或 DM_OPENAI_KEY" />
          </Form.Item>
          <Form.Item name="endpoint" label="自定义 Endpoint">
            <Input placeholder="可选，兼容自定义网关" />
          </Form.Item>
          <Form.Item name="qps_limit" label="QPS 限制">
            <Input type="number" placeholder="默认为 0 表示不限" />
          </Form.Item>
          <Form.Item name="daily_quota" label="每日配额">
            <Input type="number" placeholder="可选" />
          </Form.Item>
          <Form.Item name="cost_metric" label="成本指标">
            <Input type="number" placeholder="可选，单位按实际计费自定义" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingRoute ? '编辑路由策略' : '新增路由策略'}
        open={routeModalVisible}
        onOk={handleSaveRoute}
        onCancel={() => setRouteModalVisible(false)}
        width={640}
      >
        <Form form={routeForm} layout="vertical">
          <Form.Item name="scenario" label="场景" rules={[{ required: true }]}>
            <Select placeholder="选择场景" disabled={!!editingRoute}>
              <Option value="intent">意图</Option>
              <Option value="sql">SQL</Option>
              <Option value="summary">总结</Option>
              <Option value="embedding">Embedding</Option>
            </Select>
          </Form.Item>
          <Form.Item name="primary_model_id" label="主模型" rules={[{ required: true }]}>
            <Select placeholder="选择主模型">
              {configs.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.model_name} ({providerLabel[c.provider]})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="fallback_model_ids" label="备选模型">
            <Select mode="multiple" placeholder="可多选">
              {configs.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.model_name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="rules"
            label="路由规则（JSON）"
            tooltip='例如：{"strategy":"latency","circuit_breaker":true}'
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
