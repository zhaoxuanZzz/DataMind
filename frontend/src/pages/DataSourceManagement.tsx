import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, message, Space, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { datasourceService } from '../services/datasource'
import { DataSourceResponse, DataSourceType, DataSourceCreate, DataSourceUpdate } from '../types'

const { Option } = Select

// 数据源类型默认值配置
const DATASOURCE_DEFAULTS: Record<DataSourceType, { host: string; port: number }> = {
  [DataSourceType.POSTGRESQL]: { host: '127.0.0.1', port: 5432 },
  [DataSourceType.MYSQL]: { host: '127.0.0.1', port: 3306 },
  [DataSourceType.MILVUS]: { host: '127.0.0.1', port: 19530 },
  [DataSourceType.CHROMADB]: { host: '127.0.0.1', port: 8000 },
}

export default function DataSourceManagement() {
  const [dataSources, setDataSources] = useState<DataSourceResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingId, setEditingId] = useState<number>()
  const [form] = Form.useForm()

  useEffect(() => {
    loadDataSources()
  }, [])

  const loadDataSources = async () => {
    setLoading(true)
    try {
      const data = await datasourceService.list()
      setDataSources(data)
    } catch (err) {
      message.error('加载数据源失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingId(undefined)
    form.resetFields()
    setModalVisible(true)
  }

  const handleTypeChange = (type: DataSourceType) => {
    // 当数据源类型改变时，自动设置默认的 host 和 port
    const defaults = DATASOURCE_DEFAULTS[type]
    if (defaults) {
      form.setFieldsValue({
        host: defaults.host,
        port: defaults.port,
      })
    }
  }

  const handleEdit = (record: DataSourceResponse) => {
    setEditingId(record.id)
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      description: record.description,
      timeout: record.timeout,
      max_rows: record.max_rows,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个数据源吗？',
      onOk: async () => {
        try {
          await datasourceService.delete(id)
          message.success('删除成功')
          loadDataSources()
        } catch (err) {
          message.error('删除失败')
        }
      },
    })
  }

  const handleTest = async (id: number) => {
    try {
      const result = await datasourceService.test(id)
      if (result.success) {
        message.success('连接测试成功')
      } else {
        message.error('连接测试失败')
      }
      loadDataSources()
    } catch (err: any) {
      message.error(err.message || '连接测试失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingId) {
        const update: DataSourceUpdate = {
          name: values.name,
          description: values.description,
          timeout: values.timeout,
          max_rows: values.max_rows,
        }
        await datasourceService.update(editingId, update)
        message.success('更新成功')
      } else {
        const create: DataSourceCreate = {
          name: values.name,
          type: values.type,
          description: values.description,
          connection_info: {
            host: values.host,
            port: values.port,
            user: values.user,
            password: values.password,
            database: values.database,
          },
          timeout: values.timeout || 30,
          max_rows: values.max_rows || 10000,
        }
        await datasourceService.create(create)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadDataSources()
    } catch (err: any) {
      message.error(err.message || '操作失败')
    }
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: DataSourceType) => <Tag>{type}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'active' ? 'green' : status === 'error' ? 'red' : 'default'
        return <Tag color={color}>{status}</Tag>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: DataSourceResponse) => (
        <Space>
          <Button
            type="link"
            icon={<CheckCircleOutlined />}
            onClick={() => handleTest(record.id)}
          >
            测试
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>数据源管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建数据源
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={dataSources}
        loading={loading}
        rowKey="id"
      />

      <Modal
        title={editingId ? '编辑数据源' : '新建数据源'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select disabled={!!editingId} onChange={handleTypeChange}>
              <Option value={DataSourceType.MYSQL}>MySQL</Option>
              <Option value={DataSourceType.POSTGRESQL}>PostgreSQL</Option>
              <Option value={DataSourceType.CHROMADB}>ChromaDB</Option>
              <Option value={DataSourceType.MILVUS}>Milvus</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea />
          </Form.Item>
          {!editingId && (
            <>
              <Form.Item name="host" label="主机" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="port" label="端口" rules={[{ required: true }]}>
                <Input type="number" />
              </Form.Item>
              <Form.Item name="user" label="用户名" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true }]}>
                <Input.Password />
              </Form.Item>
              <Form.Item name="database" label="数据库/Collection">
                <Input />
              </Form.Item>
            </>
          )}
          <Form.Item name="timeout" label="超时时间（秒）">
            <Input type="number" defaultValue={30} />
          </Form.Item>
          <Form.Item name="max_rows" label="最大返回行数">
            <Input type="number" defaultValue={10000} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
