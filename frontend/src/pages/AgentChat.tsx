import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Input,
  Button,
  Select,
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
  MessageOutlined,
  TableOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { chatService } from '../services/chat'
import { datasourceService } from '../services/datasource'
import {
  ChatSessionListItem,
  ChatMessage,
  ChatMessageRole,
  ChatMessageType,
  DataSourceResponse,
} from '../types'

const { Text } = Typography
const { TextArea } = Input
const { Option } = Select

const suggestions = [
  { emoji: '📊', text: '统计各产品类别的销售额占比' },
  { emoji: '📈', text: '查询最近30天的每日订单数量趋势' },
  { emoji: '🏆', text: '列出销售额TOP10的商品' },
  { emoji: '🗺️', text: '查看各城市的订单分布' },
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
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [])

  useEffect(() => { loadSessions(); loadDataSources() }, [])
  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const loadSessions = async () => {
    setSessionsLoading(true)
    try { setSessions(await chatService.listSessions()) } catch { /* noop */ }
    finally { setSessionsLoading(false) }
  }

  const loadDataSources = async () => {
    try { setDataSources(await datasourceService.list()) } catch { /* noop */ }
  }

  const handleNewSession = async () => {
    try {
      const s = await chatService.createSession({ data_source_id: selectedDsId })
      await loadSessions()
      setActiveSessionId(s.id)
      setMessages([])
    } catch { message.error('创建失败') }
  }

  const handleSelectSession = async (id: number) => {
    setActiveSessionId(id)
    try {
      const d = await chatService.getSession(id)
      setMessages(d.messages)
      if (d.data_source_id) setSelectedDsId(d.data_source_id)
    } catch { message.error('加载失败') }
  }

  const handleDeleteSession = async (id: number) => {
    try {
      await chatService.deleteSession(id)
      if (activeSessionId === id) { setActiveSessionId(null); setMessages([]) }
      await loadSessions()
    } catch { message.error('删除失败') }
  }

  const handleSend = async (text?: string) => {
    const content = text || inputValue.trim()
    if (!content || loading) return
    if (!activeSessionId) {
      try {
        const s = await chatService.createSession({ data_source_id: selectedDsId })
        await loadSessions()
        setActiveSessionId(s.id)
        await doSend(s.id, content)
      } catch { message.error('创建失败') }
      return
    }
    await doSend(activeSessionId, content)
  }

  const doSend = async (sid: number, content: string) => {
    setInputValue('')
    setLoading(true)
    const tempMsg: ChatMessage = {
      id: -Date.now(), session_id: sid, role: ChatMessageRole.USER,
      content, message_type: ChatMessageType.TEXT, created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])
    scrollToBottom()
    try {
      const newMsgs = await chatService.sendMessage(sid, { content, data_source_id: selectedDsId })
      setMessages(prev => [...prev.filter(m => m.id !== tempMsg.id), ...newMsgs])
      await loadSessions()
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: -Date.now() - 1, session_id: sid, role: ChatMessageRole.ASSISTANT,
        content: `处理出错: ${err?.response?.data?.detail || err?.message || '未知错误'}`,
        message_type: ChatMessageType.ERROR, created_at: new Date().toISOString(),
      }])
    } finally { setLoading(false); inputRef.current?.focus() }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const copyText = (t: string) => { navigator.clipboard.writeText(t); message.success('已复制') }

  const simpleMarkdown = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background:var(--surface-ground);padding:1px 5px;border-radius:4px;font-size:12px;font-family:var(--font-mono)">$1</code>')
      .replace(/\n/g, '<br/>')
      .replace(/## (.*?)(<br\/>|$)/g, '<h4 style="font-family:var(--font-display);margin:10px 0 4px;font-size:14px;font-weight:600">$1</h4>')
      .replace(/- (.*?)(<br\/>|$)/g, '<div style="padding-left:14px">• $1</div>')

  const renderContent = (msg: ChatMessage) => {
    if (msg.role === ChatMessageRole.USER) {
      return <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{msg.content}</div>
    }
    return (
      <div>
        {msg.content && (
          <div
            style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: simpleMarkdown(msg.content) }}
          />
        )}
        {msg.generated_sql && (
          <div style={{
            marginTop: 12, background: '#16161e', borderRadius: 'var(--radius-md)',
            padding: '10px 14px', position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ color: '#6b7084', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>SQL</span>
              <Tooltip title="复制"><Button type="text" size="small" icon={<CopyOutlined style={{ color: '#6b7084' }} />}
                onClick={() => copyText(msg.generated_sql!)} /></Tooltip>
            </div>
            <pre style={{
              margin: 0, color: '#e2e0d8', fontSize: 12.5, fontFamily: 'var(--font-mono)',
              overflow: 'auto', maxHeight: 140, lineHeight: 1.6,
            }}>{msg.generated_sql}</pre>
          </div>
        )}
        {msg.message_type === ChatMessageType.CHART && msg.chart_option && (
          <div style={{ marginTop: 14 }}>
            <ReactECharts option={msg.chart_option} style={{ height: 320, width: '100%' }} opts={{ renderer: 'svg' }} />
            {msg.table_data && msg.table_data.length > 0 && (
              <Tabs size="small" style={{ marginTop: 8 }} items={[
                { key: 'chart', label: <span><BarChartOutlined /> 图表</span>, children: null },
                { key: 'table', label: <span><TableOutlined /> 数据({msg.table_data.length})</span>,
                  children: renderTable(msg.table_data, msg.table_columns) },
              ]} />
            )}
          </div>
        )}
      </div>
    )
  }

  const renderTable = (data: Record<string, any>[], columns?: string[]) => {
    if (!data.length) return <Empty description="无数据" />
    const cols = columns || Object.keys(data[0])
    return (
      <div style={{ overflowX: 'auto', maxHeight: 260, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, fontFamily: 'var(--font-body)' }}>
          <thead>
            <tr>{cols.map(c => (
              <th key={c} style={{
                background: 'var(--surface-ground)', borderBottom: '1px solid var(--border)',
                padding: '7px 10px', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap',
                position: 'sticky', top: 0, zIndex: 1, fontFamily: 'var(--font-display)', fontSize: 11.5,
                color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>{c}</th>
            ))}</tr>
          </thead>
          <tbody>{data.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {cols.map(c => (
                <td key={c} style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                  {row[c]?.toString() ?? '-'}
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
    )
  }

  const renderWelcome = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: '40px 20px',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, var(--accent) 0%, #f59e0b 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: '#fff',
        marginBottom: 20, boxShadow: '0 8px 24px rgba(232,85,61,0.2)',
      }}>
        <RobotOutlined />
      </div>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22,
        letterSpacing: '-0.02em', marginBottom: 6, color: 'var(--text-primary)',
      }}>
        智能分析助手
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 36, textAlign: 'center', maxWidth: 400, fontSize: 14, lineHeight: 1.7 }}>
        选择数据源，用自然语言描述你的问题。
        <br />
        我会生成 SQL、执行查询、推荐最佳图表。
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 520, width: '100%' }}>
        {suggestions.map((s, i) => (
          <div
            key={i}
            onClick={() => handleSend(s.text)}
            style={{
              padding: '14px 16px', background: 'var(--surface-card)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5,
              transition: 'all var(--duration-fast) var(--ease-out)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-soft)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-card)' }}
          >
            <span style={{ marginRight: 8 }}>{s.emoji}</span>{s.text}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="animate-fade-in" style={{
      display: 'flex', height: 'calc(100vh - 84px)',
      background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)',
      overflow: 'hidden', border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* ── Sessions sidebar ─────────────────────── */}
      <div style={{
        width: 260, borderRight: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column', background: 'var(--surface-ground)',
      }}>
        <div style={{ padding: '14px 14px 10px' }}>
          <Button type="primary" icon={<PlusOutlined />} block onClick={handleNewSession}
            style={{ borderRadius: 'var(--radius-md)', height: 38, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
            新建对话
          </Button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px' }}>
          {sessionsLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}><Spin size="small" /></div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
              <MessageOutlined style={{ fontSize: 28, marginBottom: 6, display: 'block' }} />
              <span style={{ fontSize: 12.5 }}>暂无对话</span>
            </div>
          ) : sessions.map(s => {
            const active = activeSessionId === s.id
            return (
              <div key={s.id} onClick={() => handleSelectSession(s.id)}
                style={{
                  padding: '9px 12px', marginBottom: 3, borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', position: 'relative',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  border: active ? '1px solid var(--accent-subtle)' : '1px solid transparent',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.025)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{
                      fontWeight: active ? 600 : 400, fontSize: 13, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                    }}>
                      {s.title}
                    </div>
                    {s.last_message && (
                      <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.last_message}
                      </div>
                    )}
                  </div>
                  <Popconfirm title="删除此对话？" okText="删除" cancelText="取消"
                    onConfirm={e => { e?.stopPropagation(); handleDeleteSession(s.id) }}
                    onCancel={e => e?.stopPropagation()}>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />}
                      onClick={e => e.stopPropagation()} style={{ opacity: 0.35 }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.35')} />
                  </Popconfirm>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Main chat area ────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface-card)' }}>
        {/* Toolbar */}
        <div style={{
          padding: '10px 24px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--accent) 0%, #f59e0b 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: '#fff',
            }}>
              <RobotOutlined />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
              Agent 对话
            </span>
            {activeSessionId && <Tag style={{ borderRadius: 'var(--radius-full)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>#{activeSessionId}</Tag>}
          </div>
          <Select style={{ width: 200 }} placeholder="选择数据源" value={selectedDsId}
            onChange={setSelectedDsId} allowClear suffixIcon={<DatabaseOutlined />} size="small">
            {dataSources.map(ds => (
              <Option key={ds.id} value={ds.id}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                  <Tag color={ds.type === 'sqlite' ? 'green' : ds.type === 'mysql' ? 'blue' : 'cyan'}
                    style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', borderRadius: 4 }}>
                    {ds.type}
                  </Tag>
                  {ds.name}
                </span>
              </Option>
            ))}
          </Select>
        </div>

        {/* Messages */}
        {messages.length === 0 && !loading ? renderWelcome() : (
          <div style={{ flex: 1, overflow: 'auto', padding: '20px 0' }}>
            {messages.map(msg => {
              const isUser = msg.role === ChatMessageRole.USER
              return (
                <div key={msg.id} style={{
                  display: 'flex', gap: 12, marginBottom: 22, padding: '0 28px',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-md)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                    background: isUser ? 'var(--shell-bg)' : 'linear-gradient(135deg, var(--accent) 0%, #f59e0b 100%)',
                    color: '#fff',
                  }}>
                    {isUser ? <UserOutlined /> : <RobotOutlined />}
                  </div>
                  <div style={{
                    maxWidth: isUser ? '65%' : '80%',
                    background: isUser ? 'var(--shell-bg)' : 'var(--surface-ground)',
                    color: isUser ? '#fff' : 'var(--text-primary)',
                    borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    padding: '12px 16px', fontSize: 13.5, lineHeight: 1.65,
                    border: isUser ? 'none' : '1px solid var(--border-subtle)',
                  }}>
                    {renderContent(msg)}
                  </div>
                </div>
              )
            })}
            {loading && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 22, padding: '0 28px' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 'var(--radius-md)', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--accent) 0%, #f59e0b 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14,
                }}>
                  <RobotOutlined />
                </div>
                <div style={{
                  background: 'var(--surface-ground)', borderRadius: '14px 14px 14px 4px',
                  padding: '14px 20px', border: '1px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Spin size="small" />
                  <Text style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>分析中...</Text>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '14px 24px 18px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', maxWidth: 760, margin: '0 auto' }}>
            <TextArea ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入数据分析问题… (Enter 发送)"
              autoSize={{ minRows: 1, maxRows: 4 }} disabled={loading}
              style={{
                borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13.5,
                resize: 'none', fontFamily: 'var(--font-body)',
              }}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={() => handleSend()}
              loading={loading} disabled={!inputValue.trim()}
              style={{ borderRadius: 'var(--radius-md)', height: 40, width: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
