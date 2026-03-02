import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Input, Button, Select, Spin, Tag, Typography, Empty, Tooltip,
  Popconfirm, message, Tabs,
} from 'antd'
import {
  SendOutlined, PlusOutlined, DeleteOutlined, DatabaseOutlined,
  RobotOutlined, UserOutlined, CopyOutlined, MessageOutlined,
  TableOutlined, BarChartOutlined, CheckCircleFilled,
  LoadingOutlined, ClockCircleOutlined, CloseCircleFilled,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { chatService } from '../services/chat'
import { datasourceService } from '../services/datasource'
import {
  ChatSessionListItem, ChatMessage, ChatMessageRole,
  ChatMessageType, DataSourceResponse,
} from '../types'

const { Text } = Typography
const { TextArea } = Input
const { Option } = Select

const suggestions = [
  { emoji: '📊', text: '统计各产品类别的销售额占比' },
  { emoji: '📈', text: '查询最近30天的每日订单数量趋势' },
  { emoji: '🏆', text: '列出销售额TOP10的商品' },
  { emoji: '📋', text: '综合分析销售趋势、分类占比和排名' },
]

/* ── Plan Step Component ── */
function PlanSteps({ plan }: { plan: NonNullable<ChatMessage['plan_data']> }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)', overflow: 'hidden', marginTop: 8,
    }}>
      <div style={{
        padding: '10px 16px', background: 'var(--gradient-light)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
        color: 'var(--accent)',
      }}>
        <span>📋</span> 分析计划
        <Tag style={{
          marginLeft: 'auto', borderRadius: 'var(--radius-full)',
          fontSize: 11, border: 'none',
          background: plan.status === 'completed' ? 'var(--green-soft)' : 'var(--accent-soft)',
          color: plan.status === 'completed' ? 'var(--green)' : 'var(--accent)',
        }}>
          {plan.status === 'completed' ? '已完成' : plan.status === 'running' ? '执行中' : '部分完成'}
        </Tag>
      </div>
      <div style={{ padding: '6px 0' }}>
        {plan.steps.map((step, idx) => {
          const statusIcon = step.status === 'done'
            ? <CheckCircleFilled style={{ color: 'var(--green)', animation: 'checkBounce 0.4s var(--ease-spring)' }} />
            : step.status === 'running'
            ? <LoadingOutlined style={{ color: 'var(--accent)' }} spin />
            : step.status === 'error'
            ? <CloseCircleFilled style={{ color: 'var(--rose)' }} />
            : <ClockCircleOutlined style={{ color: 'var(--text-tertiary)' }} />
          return (
            <div key={step.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 16px',
              background: step.status === 'running' ? 'var(--accent-soft)' : 'transparent',
              transition: 'background var(--duration-fast) var(--ease-out)',
            }}>
              <div style={{ fontSize: 14, flexShrink: 0 }}>{statusIcon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 1 }}>
                  {step.description}
                </div>
              </div>
              {step.status === 'running' && (
                <div style={{
                  height: 3, width: 60, borderRadius: 'var(--radius-full)',
                  background: 'var(--border)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 'var(--radius-full)',
                    background: 'var(--gradient)',
                    animation: 'progressFill 2s var(--ease-out) infinite',
                  }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

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
    try { setSessions(await chatService.listSessions()) } catch { /* */ }
    finally { setSessionsLoading(false) }
  }
  const loadDataSources = async () => {
    try { setDataSources(await datasourceService.list()) } catch { /* */ }
  }

  const handleNewSession = async () => {
    try {
      const s = await chatService.createSession({ data_source_id: selectedDsId })
      await loadSessions(); setActiveSessionId(s.id); setMessages([])
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
        await loadSessions(); setActiveSessionId(s.id); await doSend(s.id, content)
      } catch { message.error('创建失败') }
      return
    }
    await doSend(activeSessionId, content)
  }
  const doSend = async (sid: number, content: string) => {
    setInputValue(''); setLoading(true)
    const temp: ChatMessage = {
      id: -Date.now(), session_id: sid, role: ChatMessageRole.USER,
      content, message_type: ChatMessageType.TEXT, created_at: new Date().toISOString(),
    }
    setMessages(p => [...p, temp]); scrollToBottom()
    try {
      const msgs = await chatService.sendMessage(sid, { content, data_source_id: selectedDsId })
      setMessages(p => [...p.filter(m => m.id !== temp.id), ...msgs]); await loadSessions()
    } catch (err: any) {
      setMessages(p => [...p, {
        id: -Date.now()-1, session_id: sid, role: ChatMessageRole.ASSISTANT,
        content: `出错: ${err?.response?.data?.detail || err?.message || '未知'}`,
        message_type: ChatMessageType.ERROR, created_at: new Date().toISOString(),
      }])
    } finally { setLoading(false); inputRef.current?.focus() }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }
  const copyText = (t: string) => { navigator.clipboard.writeText(t); message.success('已复制') }

  const md = (t: string) => t
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code style="background:#f1f5f9;padding:1px 5px;border-radius:4px;font-size:12px;font-family:var(--font-mono)">$1</code>')
    .replace(/\n/g, '<br/>')
    .replace(/## (.*?)(<br\/>|$)/g, '<h4 style="font-family:var(--font-display);margin:10px 0 4px;font-size:14px;font-weight:600">$1</h4>')
    .replace(/- (.*?)(<br\/>|$)/g, '<div style="padding-left:14px">• $1</div>')

  const renderContent = (msg: ChatMessage) => {
    if (msg.role === ChatMessageRole.USER)
      return <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.content}</div>

    return (
      <div>
        {msg.content && (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: md(msg.content) }} />
        )}
        {msg.message_type === ChatMessageType.PLAN && msg.plan_data && (
          <PlanSteps plan={msg.plan_data} />
        )}
        {msg.generated_sql && (
          <div style={{ marginTop: 12, background: '#1e293b', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>SQL</span>
              <Tooltip title="复制"><Button type="text" size="small"
                icon={<CopyOutlined style={{ color: '#94a3b8' }} />}
                onClick={() => copyText(msg.generated_sql!)} /></Tooltip>
            </div>
            <pre style={{ margin: 0, color: '#e2e8f0', fontSize: 12, fontFamily: 'var(--font-mono)', overflow: 'auto', maxHeight: 130, lineHeight: 1.6 }}>
              {msg.generated_sql}
            </pre>
          </div>
        )}
        {msg.message_type === ChatMessageType.CHART && msg.chart_option && (
          <div style={{ marginTop: 14 }}>
            <ReactECharts option={msg.chart_option} style={{ height: 300 }} opts={{ renderer: 'svg' }} />
            {msg.table_data && msg.table_data.length > 0 && (
              <Tabs size="small" style={{ marginTop: 6 }} items={[
                { key: 'c', label: <span><BarChartOutlined /> 图表</span>, children: null },
                { key: 't', label: <span><TableOutlined /> 数据({msg.table_data.length})</span>,
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
      <div style={{ overflowX: 'auto', maxHeight: 240, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr>{cols.map(c => (
            <th key={c} style={{
              background: 'var(--surface-ground)', borderBottom: '1px solid var(--border)',
              padding: '6px 10px', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap',
              position: 'sticky', top: 0, zIndex: 1, fontFamily: 'var(--font-display)',
              fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>{c}</th>
          ))}</tr></thead>
          <tbody>{data.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {cols.map(c => <td key={c} style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}>{row[c]?.toString() ?? '-'}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
    )
  }

  const renderWelcome = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 20px' }}>
      <div className="animate-float" style={{
        width: 52, height: 52, borderRadius: 'var(--radius-lg)',
        background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, color: '#fff', marginBottom: 18, boxShadow: 'var(--shadow-blue)',
      }}><RobotOutlined /></div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', marginBottom: 6 }}>智能分析助手</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32, textAlign: 'center', maxWidth: 380, fontSize: 13.5, lineHeight: 1.7 }}>
        选择数据源，用自然语言提问。<br/>支持 <strong>Plan 模式</strong>——自动拆解复杂任务，逐步执行。
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 500, width: '100%' }}>
        {suggestions.map((s, i) => (
          <div key={i} className={`animate-fade-in-up delay-${i + 1}`}
            onClick={() => handleSend(s.text)}
            style={{
              padding: '13px 15px', background: '#fff', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13,
              color: 'var(--text-primary)', lineHeight: 1.5,
              transition: 'all var(--duration-fast) var(--ease-out)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = 'var(--shadow-focus)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
          ><span style={{ marginRight: 6 }}>{s.emoji}</span>{s.text}</div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="animate-fade-in" style={{
      display: 'flex', height: 'calc(100vh - 76px)',
      background: '#fff', borderRadius: 'var(--radius-xl)',
      overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Sessions sidebar */}
      <div style={{
        width: 250, borderRight: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column', background: 'var(--surface-ground)',
      }}>
        <div style={{ padding: '12px 12px 8px' }}>
          <Button type="primary" icon={<PlusOutlined />} block onClick={handleNewSession}
            style={{ borderRadius: 'var(--radius-md)', height: 36, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5 }}>
            新建对话
          </Button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 6px 6px' }}>
          {sessionsLoading ? <div style={{ textAlign: 'center', padding: 24 }}><Spin size="small" /></div>
          : sessions.length === 0 ? <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-tertiary)', fontSize: 12 }}><MessageOutlined style={{ fontSize: 24, display: 'block', marginBottom: 4 }} />暂无对话</div>
          : sessions.map(s => {
            const active = activeSessionId === s.id
            return (
              <div key={s.id} onClick={() => handleSelectSession(s.id)}
                style={{
                  padding: '8px 10px', marginBottom: 2, borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  border: active ? '1px solid var(--accent-subtle)' : '1px solid transparent',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f1f5f9' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: active ? 600 : 400, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                    {s.last_message && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.last_message}</div>}
                  </div>
                  <Popconfirm title="删除？" okText="删除" cancelText="取消"
                    onConfirm={e => { e?.stopPropagation(); handleDeleteSession(s.id) }}
                    onCancel={e => e?.stopPropagation()}>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />}
                      onClick={e => e.stopPropagation()} style={{ opacity: 0.3 }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')} />
                  </Popconfirm>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={{
          padding: '9px 20px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 'var(--radius-sm)',
              background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: '#fff',
            }}><RobotOutlined /></div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>Agent 对话</span>
            {activeSessionId && <Tag style={{ borderRadius: 'var(--radius-full)', fontSize: 10.5, fontFamily: 'var(--font-mono)', background: 'var(--accent-soft)', color: 'var(--accent)', border: 'none' }}>#{activeSessionId}</Tag>}
          </div>
          <Select style={{ width: 190 }} placeholder="选择数据源" value={selectedDsId}
            onChange={setSelectedDsId} allowClear suffixIcon={<DatabaseOutlined />} size="small">
            {dataSources.map(ds => (
              <Option key={ds.id} value={ds.id}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                  <Tag color={ds.type === 'sqlite' ? 'green' : ds.type === 'mysql' ? 'blue' : 'cyan'} style={{ fontSize: 10, lineHeight: '15px', padding: '0 3px', borderRadius: 3 }}>{ds.type}</Tag>
                  {ds.name}
                </span>
              </Option>
            ))}
          </Select>
        </div>

        {/* Messages */}
        {messages.length === 0 && !loading ? renderWelcome() : (
          <div style={{ flex: 1, overflow: 'auto', padding: '18px 0' }}>
            {messages.map(msg => {
              const isUser = msg.role === ChatMessageRole.USER
              return (
                <div key={msg.id} className="animate-fade-in" style={{
                  display: 'flex', gap: 10, marginBottom: 18, padding: '0 24px',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 'var(--radius-md)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                    background: isUser ? 'var(--text-primary)' : 'var(--gradient)', color: '#fff',
                  }}>{isUser ? <UserOutlined /> : <RobotOutlined />}</div>
                  <div style={{
                    maxWidth: isUser ? '60%' : '82%',
                    background: isUser ? 'var(--text-primary)' : '#fff',
                    color: isUser ? '#fff' : 'var(--text-primary)',
                    borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    padding: '11px 15px', fontSize: 13, lineHeight: 1.6,
                    border: isUser ? 'none' : '1px solid var(--border)',
                    boxShadow: 'var(--shadow-xs)',
                  }}>{renderContent(msg)}</div>
                </div>
              )
            })}
            {loading && (
              <div className="animate-fade-in" style={{ display: 'flex', gap: 10, marginBottom: 18, padding: '0 24px' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 'var(--radius-md)', flexShrink: 0,
                  background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13,
                }}><RobotOutlined /></div>
                <div style={{
                  background: '#fff', borderRadius: '14px 14px 14px 4px',
                  padding: '12px 18px', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)',
                    animation: 'pulseRing 1.2s var(--ease-out) infinite',
                  }} />
                  <Text style={{ color: 'var(--text-tertiary)', fontSize: 12.5 }}>分析中…</Text>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: 720, margin: '0 auto' }}>
            <TextArea ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="输入分析问题… (Enter 发送)"
              autoSize={{ minRows: 1, maxRows: 4 }} disabled={loading}
              style={{ borderRadius: 'var(--radius-md)', padding: '9px 13px', fontSize: 13, resize: 'none' }} />
            <Button type="primary" icon={<SendOutlined />} onClick={() => handleSend()}
              loading={loading} disabled={!inputValue.trim()}
              style={{ borderRadius: 'var(--radius-md)', height: 38, width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>
            💡 输入"综合分析"类问题可触发 Plan 模式，自动拆解多步骤执行
          </div>
        </div>
      </div>
    </div>
  )
}
