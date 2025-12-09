import api from './api'
import { DataSourceCreate, DataSourceUpdate, DataSourceResponse } from '../types'

export const datasourceService = {
  list: async (): Promise<DataSourceResponse[]> => {
    return api.get('/datasources')
  },
  
  get: async (id: number): Promise<DataSourceResponse> => {
    return api.get(`/datasources/${id}`)
  },
  
  create: async (data: DataSourceCreate): Promise<DataSourceResponse> => {
    return api.post('/datasources', data)
  },
  
  update: async (id: number, data: DataSourceUpdate): Promise<DataSourceResponse> => {
    return api.put(`/datasources/${id}`, data)
  },
  
  delete: async (id: number): Promise<void> => {
    return api.delete(`/datasources/${id}`)
  },
  
  test: async (id: number): Promise<{ success: boolean; message: string }> => {
    return api.post(`/datasources/${id}/test`)
  },
}
