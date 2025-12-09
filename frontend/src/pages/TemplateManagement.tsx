import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  Popconfirm,
  Tooltip,
  Timeline,
  Empty,
  Divider,
  Row,
  Col,
  InputNumber,
  Switch,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  HistoryOutlined,
  EyeOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { templateService } from '../services/template'
import { datasourceService } from '../services/datasource'
import {
  Template,
  TemplateCreate,
  TemplateUpdate,
  TemplateVersion,
  TemplateStatus,
  TemplateParameter,
  ChartType,
  DataSourceResponse,
} from '../types'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

const statusLabel: Record<TemplateStatus, { text: string; color: string }> = {
  [TemplateStatus.DRAFT]: { text: '草稿', color: 'default' },
  [TemplateStatus.PUBLISHED]: { text: '已发布', color: 'green' },
  [TemplateStatus.ARCHIVED]: { text: '已归档', color: 'orange' },
}

const chartTypeLabels: Record<string, string> = {
  [ChartType.PIE]: '饼图',
  [ChartType.DONUT]: '环形图',
  [ChartType.BAR]: '柱状图',
  [ChartType.COLUMN]: '条形图',
  [ChartType.LINE]: '折线图',
  [ChartType.AREA]: '面积图',
  [ChartType.SCATTER]: '散点图',
  [ChartType.TABLE]: '表格',
  [ChartType.COMBO]: '组合图',
}

const parameterTypes = [
  { value: 'string', label: '字符串' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'datetime', label: '日期时间' },
  { value: 'boolean', label: '布尔值' },
  { value: 'select', label: '下拉选择' },
]

export default function TemplateManagement() {
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [dataSources, setDataSources] = useState<DataSourceResponse[]>([])

  // 抽屉状态
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false)
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false)

  // 编辑状态
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [previewingTemplate, setPreviewingTemplate] = useState<Template | null>(null)
  const [versions, setVersions] = useState<TemplateVersion[]>([])
  const [versionLoading, setVersionLoading] = useState(false)

  // 表单
  const [form] = Form.useForm()

  // 参数列表
  const [parameters, setParameters] = useState<TemplateParameter[]>([])
  const [nlExamples, setNlExamples] = useState<string[]>([])

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    try {
      const [tpls, dss] = await Promise.all([
        templateService.list(),
        datasourceService.list(),
      ])
      setTemplates(tpls)
      setDataSources(dss)
    } catch (err: any) {
      message.error(err?.message || '加载模板列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 打开编辑抽屉
  const openEditDrawer = (template?: Template) => {
    setEditingTemplate(template || null)
    setEditDrawerOpen(true)

    if (template) {
      form.setFieldsValue({
        name: template.name,
        description: template.description,
        data_source_id: template.data_source_id,
        default_chart_type: template.default_chart_type,
        default_model_scenario: template.default_model_scenario,
        permission_scope: template.permission_scope,
      })
      setParameters(template.parameters || [])
      setNlExamples(template.nl_examples || [])
    } else {
      form.resetFields()
      setParameters([])
      setNlExamples([])
    }
  }

  // 关闭编辑抽屉
  const closeEditDrawer = () => {
    setEditDrawerOpen(false)
    setEditingTemplate(null)
    form.resetFields()
    setParameters([])
    setNlExamples([])
  }

  // 保存模板
  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      const payload: TemplateCreate | TemplateUpdate = {
        name: values.name,
        description: values.description,
        data_source_id: values.data_source_id,
        default_chart_type: values.default_chart_type,
        default_model_scenario: values.default_model_scenario,
        permission_scope: values.permission_scope,
        nl_examples: nlExamples.filter((e) => e.trim()),
        parameters: parameters,
      }

      if (editingTemplate) {
        await templateService.update(editingTemplate.id, payload as TemplateUpdate)
        message.success('模板已更新')
      } else {
        await templateService.create(payload as TemplateCreate)
        message.success('模板已创建')
      }

      closeEditDrawer()
      loadData()
    } catch (err: any) {
      if (err?.errorFields) return
      message.error(err?.message || '保存模板失败')
    }
  }

  // 删除模板
  const handleDelete = async (id: number) => {
    try {
      await templateService.delete(id)
      message.success('删除成功')
      loadData()
    } catch (err: any) {
      message.error(err?.message || '删除失败')
    }
  }

  // 复制模板
  const handleDuplicate = async (id: number) => {
    try {
      await templateService.duplicate(id)
      message.success('复制成功')
      loadData()
    } catch (err: any) {
      message.error(err?.message || '复制失败')
    }
  }

  // 发布/下线
  const handlePublish = async (template: Template) => {
    try {
      if (template.status === TemplateStatus.PUBLISHED) {
        await templateService.unpublish(template.id)
        message.success('已下线')
      } else {
        await templateService.publish(template.id)
        message.success('已发布')
      }
      loadData()
    } catch (err: any) {
      message.error(err?.message || '操作失败')
    }
  }

  // 查看版本历史
  const openVersionDrawer = async (template: Template) => {
    setPreviewingTemplate(template)
    setVersionDrawerOpen(true)
    setVersionLoading(true)

    try {
      const vers = await templateService.getVersions(template.id)
      setVersions(vers)
    } catch (err: any) {
      message.error(err?.message || '加载版本历史失败')
    } finally {
      setVersionLoading(false)
    }
  }

  // 回滚版本
  const handleRollback = async (versionId: number) => {
    if (!previewingTemplate) return

    try {
      await templateService.rollback(previewingTemplate.id, versionId)
      message.success('回滚成功')
      setVersionDrawerOpen(false)
      loadData()
    } catch (err: any) {
      message.error(err?.message || '回滚失败')
    }
  }

  // 预览模板
  const openPreviewDrawer = (template: Template) => {
    setPreviewingTemplate(template)
    setPreviewDrawerOpen(true)
  }

  // 添加参数
  const addParameter = () => {
    setParameters([
      ...parameters,
      {
        name: `param_${parameters.length + 1}`,
        type: 'string',
        label: `参数${parameters.length + 1}`,
        required: false,
      },
    ])
  }

  // 更新参数
  const updateParameter = (index: number, field: keyof TemplateParameter, value: any) => {
    const newParams = [...parameters]
    newParams[index] = { ...newParams[index], [field]: value }
    setParameters(newParams)
  }

  // 删除参数
  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index))
  }

  // 添加示例
  const addExample = () => {
    setNlExamples([...nlExamples, ''])
  }

  // 更新示例
  const updateExample = (index: number, value: string) => {
    const newExamples = [...nlExamples]
    newExamples[index] = value
    setNlExamples(newExamples)
  }

  // 删除示例
  const removeExample = (index: number) => {
    setNlExamples(nlExamples.filter((_, i) => i !== index))
  }

  // 表格列定义
  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Template) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.description}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '数据源',
      dataIndex: 'data_source_name',
      key: 'data_source_name',
      render: (name: string) => name || '-',
    },
    {
      title: '默认图表',
      dataIndex: 'default_chart_type',
      key: 'default_chart_type',
      render: (type: ChartType) => chartTypeLabels[type] || type,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: TemplateStatus) => (
        <Tag color={statusLabel[status]?.color}>{statusLabel[status]?.text || status}</Tag>
      ),
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      render: (version: number) => `v${version}`,
    },
    {
      title: '创建人',
      dataIndex: 'created_by',
      key: 'created_by',
      render: (user: string) => user || '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      render: (_: any, record: Template) => (
        <Space size={0} wrap>
          <Tooltip title="预览">
            <Button type="link" icon={<EyeOutlined />} onClick={() => openPreviewDrawer(record)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="link" icon={<EditOutlined />} onClick={() => openEditDrawer(record)} />
          </Tooltip>
          <Tooltip title={record.status === TemplateStatus.PUBLISHED ? '下线' : '发布'}>
            <Button
              type="link"
              icon={
                record.status === TemplateStatus.PUBLISHED ? (
                  <CloudDownloadOutlined />
                ) : (
                  <CloudUploadOutlined />
                )
              }
              onClick={() => handlePublish(record)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button type="link" icon={<CopyOutlined />} onClick={() => handleDuplicate(record.id)} />
          </Tooltip>
          <Tooltip title="版本记录">
            <Button
              type="link"
              icon={<HistoryOutlined />}
              onClick={() => openVersionDrawer(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除此模板？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>
          模板管理
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditDrawer()}>
            新建模板
          </Button>
        </Space>
      </div>

      <Card loading={loading}>
        <Table<Template>
          columns={columns}
          dataSource={templates}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 编辑抽屉 */}
      <Drawer
        title={editingTemplate ? '编辑模板' : '新建模板'}
        placement="right"
        width={720}
        open={editDrawerOpen}
        onClose={closeEditDrawer}
        extra={
          <Space>
            <Button onClick={closeEditDrawer}>取消</Button>
            <Button type="primary" onClick={handleSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="输入模板名称" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="模板描述（可选）" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="data_source_id" label="默认数据源">
                <Select placeholder="选择数据源" allowClear>
                  {dataSources.map((ds) => (
                    <Option key={ds.id} value={ds.id}>
                      {ds.name} ({ds.type})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="default_chart_type" label="默认图表类型">
                <Select placeholder="选择图表类型">
                  {Object.entries(chartTypeLabels).map(([type, label]) => (
                    <Option key={type} value={type}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="default_model_scenario" label="默认模型场景">
                <Select placeholder="选择模型场景" allowClear>
                  <Option value="intent">意图识别</Option>
                  <Option value="sql">SQL生成</Option>
                  <Option value="summary">结果总结</Option>
                  <Option value="embedding">向量检索</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="permission_scope" label="权限范围">
                <Select placeholder="选择权限范围" allowClear>
                  <Option value="public">公开</Option>
                  <Option value="team">团队</Option>
                  <Option value="private">私有</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">自然语言示例</Divider>
          <div style={{ marginBottom: 16 }}>
            {nlExamples.map((example, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Input
                  value={example}
                  onChange={(e) => updateExample(index, e.target.value)}
                  placeholder="输入自然语言查询示例"
                />
                <Button danger onClick={() => removeExample(index)}>
                  删除
                </Button>
              </div>
            ))}
            <Button type="dashed" onClick={addExample} block icon={<PlusOutlined />}>
              添加示例
            </Button>
          </div>

          <Divider orientation="left">参数定义</Divider>
          <div style={{ marginBottom: 16 }}>
            {parameters.map((param, index) => (
              <Card key={index} size="small" style={{ marginBottom: 8 }}>
                <Row gutter={8}>
                  <Col span={6}>
                    <Input
                      value={param.name}
                      onChange={(e) => updateParameter(index, 'name', e.target.value)}
                      placeholder="参数名"
                      addonBefore="名称"
                    />
                  </Col>
                  <Col span={6}>
                    <Input
                      value={param.label}
                      onChange={(e) => updateParameter(index, 'label', e.target.value)}
                      placeholder="显示标签"
                      addonBefore="标签"
                    />
                  </Col>
                  <Col span={5}>
                    <Select
                      value={param.type}
                      onChange={(value) => updateParameter(index, 'type', value)}
                      style={{ width: '100%' }}
                    >
                      {parameterTypes.map((pt) => (
                        <Option key={pt.value} value={pt.value}>
                          {pt.label}
                        </Option>
                      ))}
                    </Select>
                  </Col>
                  <Col span={4}>
                    <Space>
                      <Switch
                        checked={param.required}
                        onChange={(checked) => updateParameter(index, 'required', checked)}
                        checkedChildren="必填"
                        unCheckedChildren="选填"
                      />
                    </Space>
                  </Col>
                  <Col span={3}>
                    <Button danger onClick={() => removeParameter(index)}>
                      删除
                    </Button>
                  </Col>
                </Row>
                {param.type === 'select' && (
                  <div style={{ marginTop: 8 }}>
                    <Input
                      placeholder='选项（JSON格式）：[{"label":"选项1","value":"1"}]'
                      value={param.options ? JSON.stringify(param.options) : ''}
                      onChange={(e) => {
                        try {
                          const options = JSON.parse(e.target.value)
                          updateParameter(index, 'options', options)
                        } catch {
                          // 忽略解析错误
                        }
                      }}
                    />
                  </div>
                )}
              </Card>
            ))}
            <Button type="dashed" onClick={addParameter} block icon={<PlusOutlined />}>
              添加参数
            </Button>
          </div>
        </Form>
      </Drawer>

      {/* 预览抽屉 */}
      <Drawer
        title="模板预览"
        placement="right"
        width={600}
        open={previewDrawerOpen}
        onClose={() => setPreviewDrawerOpen(false)}
      >
        {previewingTemplate && (
          <div>
            <Title level={4}>{previewingTemplate.name}</Title>
            {previewingTemplate.description && (
              <Paragraph type="secondary">{previewingTemplate.description}</Paragraph>
            )}

            <Divider orientation="left">基本信息</Divider>
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Text type="secondary">状态：</Text>
                <Tag color={statusLabel[previewingTemplate.status]?.color}>
                  {statusLabel[previewingTemplate.status]?.text}
                </Tag>
              </Col>
              <Col span={12}>
                <Text type="secondary">版本：</Text>v{previewingTemplate.version}
              </Col>
              <Col span={12}>
                <Text type="secondary">数据源：</Text>
                {previewingTemplate.data_source_name || '-'}
              </Col>
              <Col span={12}>
                <Text type="secondary">默认图表：</Text>
                {chartTypeLabels[previewingTemplate.default_chart_type] ||
                  previewingTemplate.default_chart_type}
              </Col>
              <Col span={12}>
                <Text type="secondary">模型场景：</Text>
                {previewingTemplate.default_model_scenario || '-'}
              </Col>
              <Col span={12}>
                <Text type="secondary">权限范围：</Text>
                {previewingTemplate.permission_scope || '-'}
              </Col>
            </Row>

            <Divider orientation="left">自然语言示例</Divider>
            {previewingTemplate.nl_examples?.length > 0 ? (
              <ul>
                {previewingTemplate.nl_examples.map((example, idx) => (
                  <li key={idx}>{example}</li>
                ))}
              </ul>
            ) : (
              <Empty description="暂无示例" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}

            <Divider orientation="left">参数定义</Divider>
            {previewingTemplate.parameters?.length > 0 ? (
              <Table
                size="small"
                dataSource={previewingTemplate.parameters}
                rowKey="name"
                pagination={false}
                columns={[
                  { title: '名称', dataIndex: 'name', key: 'name' },
                  { title: '标签', dataIndex: 'label', key: 'label' },
                  { title: '类型', dataIndex: 'type', key: 'type' },
                  {
                    title: '必填',
                    dataIndex: 'required',
                    key: 'required',
                    render: (v: boolean) => (v ? '是' : '否'),
                  },
                ]}
              />
            ) : (
              <Empty description="暂无参数" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        )}
      </Drawer>

      {/* 版本历史抽屉 */}
      <Drawer
        title="版本历史"
        placement="right"
        width={500}
        open={versionDrawerOpen}
        onClose={() => setVersionDrawerOpen(false)}
      >
        {versionLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : versions.length > 0 ? (
          <Timeline
            items={versions.map((ver) => ({
              children: (
                <div>
                  <Space>
                    <Text strong>v{ver.version}</Text>
                    <Text type="secondary">
                      {new Date(ver.created_at).toLocaleString()}
                    </Text>
                  </Space>
                  <div>
                    <Text type="secondary">{ver.created_by || '系统'}</Text>
                  </div>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleRollback(ver.id)}
                    style={{ paddingLeft: 0 }}
                  >
                    回滚到此版本
                  </Button>
                </div>
              ),
            }))}
          />
        ) : (
          <Empty description="暂无版本记录" />
        )}
      </Drawer>
    </div>
  )
}

