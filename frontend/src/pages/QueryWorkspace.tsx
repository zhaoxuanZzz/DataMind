import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Input,
  Button,
  Select,
  Space,
  Spin,
  Alert,
  Tabs,
  Row,
  Col,
  Drawer,
  List,
  Tag,
  Tooltip,
  Collapse,
  Typography,
  Divider,
  DatePicker,
  Form,
  Empty,
  Dropdown,
  message,
} from 'antd'
import {
  PlayCircleOutlined,
  HistoryOutlined,
  CopyOutlined,
  ReloadOutlined,
  DownloadOutlined,
  ExpandOutlined,
  CompressOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  TableOutlined,
} from '@ant-design/icons'
import { queryService } from '../services/query'
import { datasourceService } from '../services/datasource'
import { templateService } from '../services/template'
import { modelService } from '../services/model'
import {
  QueryRequest,
  QueryResponse,
  DataSourceResponse,
  ChartType,
  Template,
  ModelRouteStrategy,
  QueryHistory,
} from '../types'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select
const { Text, Title, Paragraph } = Typography
const { Panel } = Collapse
const { RangePicker } = DatePicker

const chartTypeIcons: Record<string, React.ReactNode> = {
  [ChartType.BAR]: <BarChartOutlined />,
  [ChartType.LINE]: <LineChartOutlined />,
  [ChartType.PIE]: <PieChartOutlined />,
  [ChartType.TABLE]: <TableOutlined />,
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

const nlExamples = [
  '查询最近30天的用户活跃度趋势',
  '统计各产品类别的销售额占比',
  '对比本月和上月的订单数量',
  '查询TOP10销售额最高的商品',
  '分析用户注册来源分布',
]

export default function QueryWorkspace() {
  // 状态管理
  const [queryText, setQueryText] = useState('')
  const [dataSourceId, setDataSourceId] = useState<number>()
  const [templateId, setTemplateId] = useState<number>()
  const [modelScenario, setModelScenario] = useState<string>('intent')
  const [chartType, setChartType] = useState<ChartType>(ChartType.TABLE)
  const [timeRange, setTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [parameters, setParameters] = useState<Record<string, any>>({})

  // 数据
  const [dataSources, setDataSources] = useState<DataSourceResponse[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [routes, setRoutes] = useState<ModelRouteStrategy[]>([])
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([])

  // 查询状态
  const [loading, setLoading] = useState(false)
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null)
  const [error, setError] = useState<string>()
  const [executionTime, setExecutionTime] = useState<number>()

  // UI状态
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const [sqlExpanded, setSqlExpanded] = useState(true)
  const [leftCollapsed, setLeftCollapsed] = useState(false)

  // 加载初始数据
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [ds, tpl, rts] = await Promise.all([
          datasourceService.list(),
          templateService.list({ status: 'published' }),
          modelService.listRoutes(),
        ])
        setDataSources(ds)
        setTemplates(tpl)
        setRoutes(rts)
      } catch (err) {
        console.error('加载初始数据失败:', err)
      }
    }
    loadInitialData()
    loadQueryHistory()
  }, [])

  // 加载查询历史
  const loadQueryHistory = async () => {
    try {
      const logs = await queryService.getLogs(0, 10)
      // 转换为历史记录格式
      const history: QueryHistory[] = (logs as any[]).map((log: any) => ({
        id: log.id,
        query_text: log.query_text || log.request?.query_text || '未知查询',
        data_source_id: log.data_source_id,
        data_source_name: log.data_source_name,
        template_id: log.template_id,
        template_name: log.template_name,
        generated_sql: log.generated_sql,
        status: log.status,
        duration_ms: log.duration_ms,
        created_at: log.created_at,
      }))
      setQueryHistory(history)
    } catch (err) {
      console.error('加载查询历史失败:', err)
    }
  }

  // 选择模板时更新相关字段
  const handleTemplateChange = (id: number | undefined) => {
    setTemplateId(id)
    if (id) {
      const template = templates.find((t) => t.id === id)
      if (template) {
        if (template.data_source_id) {
          setDataSourceId(template.data_source_id)
        }
        if (template.default_chart_type) {
          setChartType(template.default_chart_type)
        }
        if (template.default_model_scenario) {
          setModelScenario(template.default_model_scenario)
        }
        // 设置示例文本
        if (template.nl_examples?.length > 0) {
          setQueryText(template.nl_examples[0])
        }
      }
    }
  }

  // 执行查询
  const handleExecute = async () => {
    if (!queryText.trim()) {
      setError('请输入查询内容')
      return
    }

    setLoading(true)
    setError(undefined)
    setQueryResult(null)
    const startTime = Date.now()

    try {
      const request: QueryRequest = {
        query_text: queryText,
        data_source_id: dataSourceId,
        template_id: templateId,
        chart_type: chartType,
        parameters: {
          ...parameters,
          time_range: timeRange
            ? {
                start: timeRange[0].format('YYYY-MM-DD'),
                end: timeRange[1].format('YYYY-MM-DD'),
              }
            : undefined,
          model_scenario: modelScenario,
        },
      }
      const result = await queryService.execute(request)
      setQueryResult(result)
      setExecutionTime(Date.now() - startTime)

      // 刷新历史记录
      loadQueryHistory()
    } catch (err: any) {
      setError(err.message || '查询执行失败')
    } finally {
      setLoading(false)
    }
  }

  // 复制SQL
  const handleCopySQL = () => {
    if (queryResult?.generated_sql) {
      navigator.clipboard.writeText(queryResult.generated_sql)
      message.success('SQL已复制到剪贴板')
    }
  }

  // 重新生成
  const handleRegenerate = () => {
    handleExecute()
  }

  // 导出数据
  const handleExport = (format: 'csv' | 'png') => {
    if (format === 'csv' && queryResult?.data) {
      const headers = Object.keys(queryResult.data[0] || {})
      const csvContent = [
        headers.join(','),
        ...queryResult.data.map((row) =>
          headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
        ),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `query_result_${Date.now()}.csv`
      link.click()
      message.success('CSV已导出')
    }
  }

  // 从历史记录恢复
  const handleRestoreHistory = (history: QueryHistory) => {
    setQueryText(history.query_text)
    if (history.data_source_id) {
      setDataSourceId(history.data_source_id)
    }
    if (history.template_id) {
      setTemplateId(history.template_id)
    }
    setHistoryDrawerOpen(false)
  }

  // 渲染图表
  const renderChart = useCallback(() => {
    if (!queryResult?.data || queryResult.data.length === 0) {
      return (
        <Empty
          description="暂无数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={handleRegenerate}>
            重新生成
          </Button>
        </Empty>
      )
    }

    const currentChartType = chartType || queryResult.recommended_charts?.[0] || ChartType.TABLE
    const data = queryResult.data

    if (currentChartType === ChartType.TABLE) {
      const columns = Object.keys(data[0])
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {columns.map((col) => (
                  <th
                    key={col}
                    style={{
                      border: '1px solid #f0f0f0',
                      padding: '12px 8px',
                      fontWeight: 600,
                      textAlign: 'left',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  {columns.map((col) => (
                    <td
                      key={col}
                      style={{ border: '1px solid #f0f0f0', padding: '10px 8px' }}
                    >
                      {row[col]?.toString() ?? '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    // ECharts配置
    const fields = Object.keys(data[0])
    const categoryField = fields[0]
    const valueFields = fields.slice(1)

    let option: any = {
      tooltip: {
        trigger: currentChartType === ChartType.PIE ? 'item' : 'axis',
      },
      legend: {
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
    }

    if (currentChartType === ChartType.PIE || currentChartType === ChartType.DONUT) {
      option = {
        ...option,
        series: [
          {
            type: 'pie',
            radius: currentChartType === ChartType.DONUT ? ['40%', '70%'] : '70%',
            data: data.map((row) => ({
              name: row[categoryField],
              value: row[valueFields[0]] || 0,
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      }
    } else if (currentChartType === ChartType.SCATTER) {
      option = {
        ...option,
        xAxis: { type: 'value', name: valueFields[0] },
        yAxis: { type: 'value', name: valueFields[1] || valueFields[0] },
        series: [
          {
            type: 'scatter',
            data: data.map((row) => [
              row[valueFields[0]] || 0,
              row[valueFields[1]] || row[valueFields[0]] || 0,
            ]),
          },
        ],
      }
    } else {
      // 柱状图、折线图、面积图
      option = {
        ...option,
        xAxis: {
          type: 'category',
          data: data.map((row) => row[categoryField]),
          axisLabel: {
            rotate: data.length > 10 ? 45 : 0,
          },
        },
        yAxis: { type: 'value' },
        series: valueFields.map((field) => ({
          name: field,
          type:
            currentChartType === ChartType.BAR || currentChartType === ChartType.COLUMN
              ? 'bar'
              : currentChartType === ChartType.AREA
              ? 'line'
              : 'line',
          data: data.map((row) => row[field] || 0),
          areaStyle: currentChartType === ChartType.AREA ? {} : undefined,
          smooth: currentChartType === ChartType.LINE || currentChartType === ChartType.AREA,
        })),
      }
    }

    return <ReactECharts option={option} style={{ height: 400 }} />
  }, [queryResult, chartType])

  // 渲染左侧参数面板
  const renderLeftPanel = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 自然语言输入 */}
      <Card
        size="small"
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#1890ff' }} />
            <span>自然语言查询</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <TextArea
          rows={4}
          placeholder="输入自然语言查询，例如：查询最近30天的用户活跃度趋势"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            示例查询：
          </Text>
        </div>
        <Space wrap size={[4, 4]}>
          {nlExamples.slice(0, 3).map((example, idx) => (
            <Tag
              key={idx}
              style={{ cursor: 'pointer' }}
              onClick={() => setQueryText(example)}
            >
              {example.slice(0, 15)}...
            </Tag>
          ))}
        </Space>
      </Card>

      {/* 模板选择 */}
      <Card
        size="small"
        title={
          <Space>
            <FileTextOutlined style={{ color: '#52c41a' }} />
            <span>模板</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="选择查询模板（可选）"
          value={templateId}
          onChange={handleTemplateChange}
          allowClear
        >
          {templates.map((tpl) => (
            <Option key={tpl.id} value={tpl.id}>
              {tpl.name}
            </Option>
          ))}
        </Select>
      </Card>

      {/* 数据源选择 */}
      <Card
        size="small"
        title={
          <Space>
            <DatabaseOutlined style={{ color: '#722ed1' }} />
            <span>数据源</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="选择数据源"
          value={dataSourceId}
          onChange={setDataSourceId}
          allowClear
        >
          {dataSources.map((ds) => (
            <Option key={ds.id} value={ds.id}>
              <Space>
                <Tag color={ds.type === 'mysql' ? 'blue' : ds.type === 'postgresql' ? 'cyan' : 'purple'}>
                  {ds.type}
                </Tag>
                {ds.name}
              </Space>
            </Option>
          ))}
        </Select>
      </Card>

      {/* 模型场景 */}
      <Card
        size="small"
        title={
          <Space>
            <RobotOutlined style={{ color: '#fa8c16' }} />
            <span>模型场景</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Select
          style={{ width: '100%' }}
          value={modelScenario}
          onChange={setModelScenario}
        >
          <Option value="intent">意图识别</Option>
          <Option value="sql">SQL生成</Option>
          <Option value="summary">结果总结</Option>
          <Option value="embedding">向量检索</Option>
        </Select>
      </Card>

      {/* 参数面板 */}
      <Collapse
        defaultActiveKey={['params']}
        ghost
        style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }}
      >
        <Panel header="高级参数" key="params">
          <Form layout="vertical" size="small">
            <Form.Item label="时间范围">
              <RangePicker
                style={{ width: '100%' }}
                value={timeRange}
                onChange={(dates) => setTimeRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              />
            </Form.Item>
            <Form.Item label="默认图表类型">
              <Select value={chartType} onChange={setChartType}>
                {Object.entries(chartTypeLabels).map(([type, label]) => (
                  <Option key={type} value={type}>
                    <Space>
                      {chartTypeIcons[type]}
                      {label}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Panel>
      </Collapse>

      {/* 执行按钮 */}
      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleExecute}
          loading={loading}
          size="large"
          block
        >
          执行查询
        </Button>
      </div>
    </div>
  )

  // 渲染中间SQL/向量面板
  const renderMiddlePanel = () => (
    <Card
      size="small"
      title={
        <Space>
          <span>生成的SQL/向量请求</span>
          {executionTime && (
            <Tag icon={<ClockCircleOutlined />} color="blue">
              {executionTime}ms
            </Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="复制SQL">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={handleCopySQL}
              disabled={!queryResult?.generated_sql}
            />
          </Tooltip>
          <Tooltip title="重新生成">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={handleRegenerate}
              loading={loading}
            />
          </Tooltip>
          <Tooltip title={sqlExpanded ? '收起' : '展开'}>
            <Button
              type="text"
              icon={sqlExpanded ? <CompressOutlined /> : <ExpandOutlined />}
              onClick={() => setSqlExpanded(!sqlExpanded)}
            />
          </Tooltip>
        </Space>
      }
      style={{ marginBottom: 16 }}
      bodyStyle={{ display: sqlExpanded ? 'block' : 'none' }}
    >
      {queryResult?.generated_sql ? (
        <pre
          style={{
            background: '#f6f8fa',
            padding: 12,
            borderRadius: 6,
            overflow: 'auto',
            maxHeight: 200,
            margin: 0,
            fontSize: 13,
          }}
        >
          {queryResult.generated_sql}
        </pre>
      ) : queryResult?.vector_request ? (
        <pre
          style={{
            background: '#f6f8fa',
            padding: 12,
            borderRadius: 6,
            overflow: 'auto',
            maxHeight: 200,
            margin: 0,
            fontSize: 13,
          }}
        >
          {JSON.stringify(queryResult.vector_request, null, 2)}
        </pre>
      ) : (
        <Empty
          description="执行查询后将显示生成的SQL或向量请求"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Card>
  )

  // 渲染右侧结果面板
  const renderRightPanel = () => (
    <Card
      title="查询结果"
      extra={
        <Space>
          <Select
            value={chartType}
            onChange={setChartType}
            style={{ width: 120 }}
            size="small"
          >
            {Object.entries(chartTypeLabels).map(([type, label]) => (
              <Option key={type} value={type}>
                {label}
              </Option>
            ))}
          </Select>
          <Dropdown
            menu={{
              items: [
                { key: 'csv', label: '导出CSV', onClick: () => handleExport('csv') },
                { key: 'png', label: '导出PNG', disabled: true },
              ],
            }}
          >
            <Button icon={<DownloadOutlined />} size="small">
              导出
            </Button>
          </Dropdown>
          <Tooltip title="查询历史">
            <Button
              icon={<HistoryOutlined />}
              size="small"
              onClick={() => setHistoryDrawerOpen(true)}
            />
          </Tooltip>
        </Space>
      }
    >
      {error && (
        <Alert
          message="查询失败"
          description={
            <div>
              <Paragraph>{error}</Paragraph>
              <Space>
                <Button size="small" onClick={handleRegenerate}>
                  重试
                </Button>
                <Button size="small" onClick={() => setChartType(ChartType.TABLE)}>
                  切换为表格
                </Button>
              </Space>
            </div>
          }
          type="error"
          style={{ marginBottom: 16 }}
        />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#999' }}>正在执行查询...</div>
        </div>
      ) : (
        <Tabs
          items={[
            {
              key: 'chart',
              label: (
                <Space>
                  {chartTypeIcons[chartType] || <BarChartOutlined />}
                  图表
                </Space>
              ),
              children: renderChart(),
            },
            {
              key: 'data',
              label: (
                <Space>
                  <TableOutlined />
                  数据
                </Space>
              ),
              children: queryResult?.data ? (
                <pre style={{ maxHeight: 400, overflow: 'auto' }}>
                  {JSON.stringify(queryResult.data, null, 2)}
                </pre>
              ) : (
                <Empty description="暂无数据" />
              ),
            },
            {
              key: 'log',
              label: (
                <Space>
                  <FileTextOutlined />
                  日志
                </Space>
              ),
              children: queryResult ? (
                <div>
                  <Paragraph>
                    <Text strong>查询ID：</Text>
                    {queryResult.query_id}
                  </Paragraph>
                  <Paragraph>
                    <Text strong>状态：</Text>
                    <Tag color={queryResult.status === 'success' ? 'green' : 'red'}>
                      {queryResult.status}
                    </Tag>
                  </Paragraph>
                  <Paragraph>
                    <Text strong>耗时：</Text>
                    {queryResult.duration_ms || executionTime}ms
                  </Paragraph>
                  {queryResult.error && (
                    <Paragraph>
                      <Text strong>错误：</Text>
                      <Text type="danger">{queryResult.error}</Text>
                    </Paragraph>
                  )}
                </div>
              ) : (
                <Empty description="暂无日志" />
              ),
            },
          ]}
        />
      )}
    </Card>
  )

  return (
    <div style={{ height: 'calc(100vh - 160px)' }}>
      <Row gutter={16} style={{ height: '100%' }}>
        {/* 左侧参数面板 */}
        <Col
          span={leftCollapsed ? 1 : 6}
          style={{
            height: '100%',
            transition: 'all 0.3s',
            overflow: leftCollapsed ? 'hidden' : 'auto',
          }}
        >
          {!leftCollapsed && renderLeftPanel()}
          <Button
            type="text"
            icon={leftCollapsed ? <ExpandOutlined /> : <CompressOutlined />}
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            style={{
              position: 'absolute',
              top: 8,
              right: leftCollapsed ? 'auto' : 8,
              left: leftCollapsed ? 8 : 'auto',
              zIndex: 10,
            }}
          />
        </Col>

        {/* 中间和右侧面板 */}
        <Col span={leftCollapsed ? 23 : 18} style={{ height: '100%', overflow: 'auto' }}>
          {/* 中间SQL面板 */}
          {renderMiddlePanel()}

          {/* 右侧结果面板 */}
          {renderRightPanel()}
        </Col>
      </Row>

      {/* 历史记录抽屉 */}
      <Drawer
        title="查询历史"
        placement="right"
        width={400}
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
      >
        <List
          dataSource={queryHistory}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  size="small"
                  onClick={() => handleRestoreHistory(item)}
                >
                  恢复
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Text ellipsis style={{ maxWidth: 250 }}>
                    {item.query_text}
                  </Text>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.data_source_name || '未指定数据源'}
                    </Text>
                    <Space size={4}>
                      <Tag
                        color={item.status === 'success' ? 'green' : 'red'}
                        style={{ fontSize: 10 }}
                      >
                        {item.status}
                      </Tag>
                      {item.duration_ms && (
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          {item.duration_ms}ms
                        </Text>
                      )}
                      <Text type="secondary" style={{ fontSize: 10 }}>
                        {new Date(item.created_at).toLocaleString()}
                      </Text>
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: '暂无查询历史' }}
        />
      </Drawer>
    </div>
  )
}
