import api from './api'
import {
  ModelConfig,
  ModelConfigCreate,
  ModelConfigUpdate,
  ModelRouteStrategy,
  ModelRouteStrategyCreate,
  ModelRouteStrategyUpdate,
  ModelCallLog,
  ModelGatewayStats,
} from '../types'

export const modelService = {
  listConfigs: async (): Promise<ModelConfig[]> => {
    return api.get('/models/configs')
  },
  createConfig: async (payload: ModelConfigCreate): Promise<ModelConfig> => {
    return api.post('/models/configs', payload)
  },
  updateConfig: async (
    id: number,
    payload: ModelConfigUpdate
  ): Promise<ModelConfig> => {
    return api.put(`/models/configs/${id}`, payload)
  },
  deleteConfig: async (id: number): Promise<void> => {
    return api.delete(`/models/configs/${id}`)
  },
  listRoutes: async (): Promise<ModelRouteStrategy[]> => {
    return api.get('/models/routes')
  },
  createRoute: async (
    payload: ModelRouteStrategyCreate
  ): Promise<ModelRouteStrategy> => {
    return api.post('/models/routes', payload)
  },
  updateRoute: async (
    id: number,
    payload: ModelRouteStrategyUpdate
  ): Promise<ModelRouteStrategy> => {
    return api.put(`/models/routes/${id}`, payload)
  },
  deleteRoute: async (id: number): Promise<void> => {
    return api.delete(`/models/routes/${id}`)
  },
  listLogs: async (params?: {
    scenario?: string
    model_id?: number
    status?: string
    skip?: number
    limit?: number
  }): Promise<ModelCallLog[]> => {
    return api.get('/models/logs', { params })
  },
  getStats: async (): Promise<ModelGatewayStats> => {
    return api.get('/models/stats')
  },
}

