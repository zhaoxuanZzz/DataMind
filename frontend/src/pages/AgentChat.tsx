import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Input,
  Button,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Empty,
  Tooltip,
  Popconfirm,
  message,
  Tabs,
} from 'antd'
import {
  SendOutlined,
  PlusOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  RobotOutlined,
  UserOutlined,
  CopyOutlined,
  ReloadOutlined,
  MessageOutlined,
  TableOutlined,
  BarChartOutlined,
  QuestionCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { chatService } from '../services/chat'
import { datasourceService } from '../services/datasource'
import {
  ChatSession,
  ChatSessionListItem,
  ChatMessage,
  ChatMessageRole,
  ChatMessageType,
  DataSourceResponse,
} from '../types'

const { Text, Paragraph } = Typography
const { TextArea } = Input
const { Option } = Select

const welcomeSuggestions = [
  { icon: '📊', text: '查询最近30天的每日订单数量，用折线图展示' },
  { icon: '🥧', text: '统计各产品类别的销售额占比' },
  { icon: '🏆', text: '列出销售额TOP10的客户' },
  { icon: '📈', text: '对比本月和上月的收入趋势' },
]

export default function AgentChat() {
  const [sessions, setSessions] = useState<ChatSessionListItem[]>([])
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [dataSources, setDataSources] = useState<DataSourceResponse[]>([])
  const [selectedDsId, setSelectedDsId] = useState<number | undefined>()
  const [sessionsLoading, setSessionsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<any>(null)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  useEffect(() => {
    loadSessions()
    loadDataSources()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const loadSessions = async () => {
    setSessionsLoading(true)
    try {
      const list = await chatService.listSessions()
      setSessions(list)
    } catch {
      console.error('加载会话列表失败')
    } finally {
      setSessionsLoading(false)
    }
  }

  const loadDataSources = async () => {
    try {
      const list = await datasourceService.list()
      setDataSources(list)
    } catch {
      console.error('加载数据源失败')
    }
  }

  const handleNewSession = async () => {
    try {
      const session = await chatService.createSession({
        data_source_id: selectedDsId,
      })
      await loadSessions()
      setActiveSessionId(session.id)
      setMessages([])
    } catch {
      message.error('创建会话失败')
    }
  }

  const handleSelectSession = async (sessionId: number) => {
    setActiveSessionId(sessionId)
    try {
      const detail = await chatService.getSession(sessionId)
      setMessages(detail.messages)
      if (detail.data_source_id) {
        setSelectedDsId(detail.data_source_id)
      }
    } catch {
      message.error('加载会话失败')
    }
  }

  const handleDeleteSession = async (sessionId: number) => {
    try {
      await chatService.deleteSession(sessionId)
      if (activeSessionId === sessionId) {
        setActiveSessionId(null)
        setMessages([])
      }
      await loadSessions()
      message.success('会话已删除')
    } catch {
      message.error('删除失败')
    }
  }

  const handleSend = async (text?: string) => {
    const content = text || inputValue.trim()
    if (!content || loading) return

    if (!activeSessionId) {
      try {
        const session = await chatService.createSession({
          data_source_id: selectedDsId,
        })
        await loadSessions()
        setActiveSessionId(session.id)
        await doSend(session.id, content)
      } catch {
        message.error('创建会话失败')
      }
      return
    }

    await doSend(activeSessionId, content)
  }

  const doSend = async (sessionId: number, content: string) => {
    setInputValue('')
    setLoading(true)

    const tempUserMsg: ChatMessage = {
      id: -Date.now(),
      session_id: sessionId,
      role: ChatMessageRole.USER,
      content,
      message_type: ChatMessageType.TEXT,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])
    scrollToBottom()

    try {
      const newMsgs = await chatService.sendMessage(sessionId, {
        content,
        data_source_id: selectedDsId,
      })
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id)
        return [...filtered, ...newMsgs]
      })
      await loadSessions()
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: -Date.now() - 1,
          session_id: sessionId,
          role: ChatMessageRole.ASSISTANT,
          content: `抱歉，处理消息时出错: ${err?.response?.data?.detail || err?.message || '未知错误'}`,
          message_type: ChatMessageType.ERROR,
          created_at: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
    message.success('已复制')
  }

  const renderMessageContent = (msg: ChatMessage) => {
    if (msg.role === ChatMessageRole.USER) {
      return <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
    }

    return (
      <div>
        {msg.content && (
          <div
            style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{
              __html: simpleMarkdown(msg.content),
            }}
          />
        )}

        {msg.generated_sql && (
          <div
            style={{
              marginTop: 12,
              background: '#1e1e1e',
              borderRadius: 8,
              padding: '12px 16px',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <Text style={{ color: '#888', fontSize: 12 }}>SQL</Text>
              <Tooltip title="复制SQL">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined style={{ color: '#aaa' }} />}
                  onClick={() => copyText(msg.generated_sql!)}
                />
              </Tooltip>
            </div>
            <pre
              style={{
                margin: 0,
                color: '#d4d4d4',
                fontSize: 13,
                fontFamily: "'Fira Code', 'Consolas', monospace",
                overflow: 'auto',
                maxHeight: 150,
              }}
            >
              {msg.generated_sql}
            </pre>
          </div>
        )}

        {msg.message_type === ChatMessageType.CHART && msg.chart_option && (
          <div style={{ marginTop: 16 }}>
            <ReactECharts
              option={msg.chart_option}
              style={{ height: 350, width: '100%' }}
              opts={{ renderer: 'svg' }}
            />

            {msg.table_data && msg.table_data.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Tabs
                  size="small"
                  items={[
                    {
                      key: 'chart',
                      label: (
                        <Space size={4}>
                          <BarChartOutlined />
                          图表
                        </Space>
                      ),
                      children: null,
                    },
                    {
                      key: 'table',
                      label: (
                        <Space size={4}>
                          <TableOutlined />
                          数据({msg.table_data.length}行)
                        </Space>
                      ),
                      children: renderDataTable(msg.table_data, msg.table_columns),
                    },
                  ]}
                />
              </div>
            )}
          </div>
        )}

        {msg.message_type === ChatMessageType.TABLE && msg.table_data && (
          <div style={{ marginTop: 12 }}>
            {renderDataTable(msg.table_data, msg.table_columns)}
          </div>
        )}
      </div>
    )
  }

  const renderDataTable = (
    data: Record<string, any>[],
    columns?: string[]
  ) => {
    if (!data || data.length === 0) return <Empty description="无数据" />
    const cols = columns || Object.keys(data[0])
    return (
      <div style={{ overflowX: 'auto', maxHeight: 300 }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
          }}
        >
          <thead>
            <tr>
              {cols.map((col) => (
                <th
                  key={col}
                  style={{
                    background: '#fafafa',
                    border: '1px solid #f0f0f0',
                    padding: '8px 10px',
                    fontWeight: 600,
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                style={{
                  background: idx % 2 === 0 ? '#fff' : '#fafafa',
                }}
              >
                {cols.map((col) => (
                  <td
                    key={col}
                    style={{
                      border: '1px solid #f0f0f0',
                      padding: '6px 10px',
                      whiteSpace: 'nowrap',
                    }}
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

  const simpleMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/```sql\n?([\s\S]*?)```/g, '<code>$1</code>')
      .replace(/```\n?([\s\S]*?)```/g, '<code>$1</code>')
      .replace(/`(.*?)`/g, '<code style="background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:12px">$1</code>')
      .replace(/\n/g, '<br/>')
      .replace(/## (.*?)(<br\/>|$)/g, '<h4 style="margin:8px 0 4px">$1</h4>')
      .replace(/- (.*?)(<br\/>|$)/g, '<div style="padding-left:12px">• $1</div>')
  }

  const renderWelcome = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '40px 20px',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
      <h2 style={{ marginBottom: 8, fontWeight: 600, color: '#1a1a1a' }}>
        DataMind 智能分析助手
      </h2>
      <p style={{ color: '#666', marginBottom: 32, textAlign: 'center', maxWidth: 500 }}>
        输入自然语言描述，我会自动查询数据库、生成SQL、推荐可视化图表
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          maxWidth: 560,
          width: '100%',
        }}
      >
        {welcomeSuggestions.map((s, idx) => (
          <div
            key={idx}
            onClick={() => handleSend(s.text)}
            style={{
              padding: '14px 16px',
              background: '#fff',
              border: '1px solid #e8e8e8',
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: 13,
              lineHeight: 1.5,
              color: '#333',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#1890ff'
              e.currentTarget.style.background = '#f0f7ff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e8e8e8'
              e.currentTarget.style.background = '#fff'
            }}
          >
            <span style={{ marginRight: 8 }}>{s.icon}</span>
            {s.text}
          </div>
        ))}
      </div>
    </div>
  )

  const renderMessages = () => (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        padding: '20px 0',
      }}
    >
      {messages.map((msg) => {
        const isUser = msg.role === ChatMessageRole.USER
        return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 20,
              padding: '0 24px',
              flexDirection: isUser ? 'row-reverse' : 'row',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: isUser ? '#1890ff' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontSize: 16,
              }}
            >
              {isUser ? <UserOutlined /> : <RobotOutlined />}
            </div>
            <div
              style={{
                maxWidth: isUser ? '70%' : '85%',
                background: isUser ? '#1890ff' : '#f7f7f8',
                color: isUser ? '#fff' : '#1a1a1a',
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '12px 16px',
                lineHeight: 1.6,
                fontSize: 14,
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              }}
            >
              {renderMessageContent(msg)}
            </div>
          </div>
        )
      })}

      {loading && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 20,
            padding: '0 24px',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontSize: 16,
            }}
          >
            <RobotOutlined />
          </div>
          <div
            style={{
              background: '#f7f7f8',
              borderRadius: '16px 16px 16px 4px',
              padding: '16px 20px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            <Spin size="small" />
            <Text style={{ marginLeft: 8, color: '#888' }}>正在分析处理中...</Text>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 112px)',
        background: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #f0f0f0',
      }}
    >
      {/* 左侧会话列表 */}
      <div
        style={{
          width: 280,
          borderRight: '1px solid #f0f0f0',
          display: 'flex',
          flexDirection: 'column',
          background: '#fafafa',
        }}
      >
        <div style={{ padding: '16px 16px 12px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            onClick={handleNewSession}
            style={{ borderRadius: 8, height: 40 }}
          >
            新建对话
          </Button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
          {sessionsLoading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin size="small" />
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              <MessageOutlined style={{ fontSize: 32, marginBottom: 8 }} />
              <div>暂无对话</div>
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelectSession(s.id)}
                style={{
                  padding: '10px 12px',
                  marginBottom: 4,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: activeSessionId === s.id ? '#e6f4ff' : 'transparent',
                  border:
                    activeSessionId === s.id
                      ? '1px solid #91caff'
                      : '1px solid transparent',
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (activeSessionId !== s.id) {
                    e.currentTarget.style.background = '#f5f5f5'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSessionId !== s.id) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div
                      style={{
                        fontWeight: activeSessionId === s.id ? 600 : 400,
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: '#1a1a1a',
                      }}
                    >
                      <MessageOutlined style={{ marginRight: 6, color: '#999', fontSize: 12 }} />
                      {s.title}
                    </div>
                    {s.last_message && (
                      <div
                        style={{
                          fontSize: 12,
                          color: '#999',
                          marginTop: 4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.last_message}
                      </div>
                    )}
                  </div>
                  <Popconfirm
                    title="确定删除此对话？"
                    onConfirm={(e) => {
                      e?.stopPropagation()
                      handleDeleteSession(s.id)
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                    okText="删除"
                    cancelText="取消"
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                      style={{ opacity: 0.5 }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.opacity = '1')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity = '0.5')
                      }
                    />
                  </Popconfirm>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧聊天主区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 顶部工具栏 */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff',
          }}
        >
          <Space>
            <RobotOutlined style={{ fontSize: 18, color: '#722ed1' }} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>Agent 智能对话</span>
            {activeSessionId && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                会话 #{activeSessionId}
              </Tag>
            )}
          </Space>
          <Space>
            <Select
              style={{ width: 220 }}
              placeholder="选择数据源"
              value={selectedDsId}
              onChange={setSelectedDsId}
              allowClear
              suffixIcon={<DatabaseOutlined />}
              size="middle"
            >
              {dataSources.map((ds) => (
                <Option key={ds.id} value={ds.id}>
                  <Space>
                    <Tag
                      color={
                        ds.type === 'mysql'
                          ? 'blue'
                          : ds.type === 'postgresql'
                          ? 'cyan'
                          : 'purple'
                      }
                      style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}
                    >
                      {ds.type}
                    </Tag>
                    <span style={{ fontSize: 13 }}>{ds.name}</span>
                  </Space>
                </Option>
              ))}
            </Select>
            <Tooltip title="使用帮助">
              <Button
                type="text"
                icon={<QuestionCircleOutlined />}
                onClick={() => handleSend('帮助')}
              />
            </Tooltip>
          </Space>
        </div>

        {/* 消息区域 */}
        {messages.length === 0 && !loading ? renderWelcome() : renderMessages()}

        {/* 输入区域 */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #f0f0f0',
            background: '#fff',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-end',
              maxWidth: 800,
              margin: '0 auto',
            }}
          >
            <TextArea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的数据分析问题... (Enter 发送, Shift+Enter 换行)"
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{
                borderRadius: 12,
                padding: '10px 16px',
                fontSize: 14,
                resize: 'none',
              }}
              disabled={loading}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => handleSend()}
              loading={loading}
              disabled={!inputValue.trim()}
              style={{
                borderRadius: 12,
                height: 42,
                width: 42,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </div>
          <div
            style={{
              textAlign: 'center',
              marginTop: 8,
              fontSize: 12,
              color: '#bbb',
            }}
          >
            DataMind 智能分析助手 · 支持自然语言查询、SQL生成、智能图表推荐
          </div>
        </div>
      </div>
    </div>
  )
}
