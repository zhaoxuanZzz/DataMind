import { useState, useEffect } from 'react'
import { Table, Card, Tag } from 'antd'
import { queryService } from '../services/query'

export default function Logs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await queryService.getLogs()
      setLogs(data)
    } catch (err) {
      console.error('加载日志失败', err)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '查询文本',
      dataIndex: 'query_text',
      key: 'query_text',
      ellipsis: true,
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
      title: '耗时（ms）',
      dataIndex: 'duration_ms',
      key: 'duration_ms',
      render: (ms: number) => ms.toFixed(2),
    },
    {
      title: '错误',
      dataIndex: 'error',
      key: 'error',
      ellipsis: true,
    },
  ]

  return (
    <div>
      <Card title="查询日志">
        <Table
          columns={columns}
          dataSource={logs}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  )
}
