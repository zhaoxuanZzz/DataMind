import api from './api'
import { QueryRequest, QueryResponse } from '../types'

export const queryService = {
  execute: async (request: QueryRequest): Promise<QueryResponse> => {
    return api.post('/query/execute', request)
  },
  
  getLogs: async (skip: number = 0, limit: number = 100) => {
    return api.get('/query/logs', { params: { skip, limit } })
  },
}
