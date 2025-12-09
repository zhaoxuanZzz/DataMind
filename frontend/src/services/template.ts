import api from './api'
import {
  Template,
  TemplateCreate,
  TemplateUpdate,
  TemplateVersion,
} from '../types'

export const templateService = {
  list: async (params?: {
    status?: string
    data_source_id?: number
    skip?: number
    limit?: number
  }): Promise<Template[]> => {
    return api.get('/templates', { params })
  },

  get: async (id: number): Promise<Template> => {
    return api.get(`/templates/${id}`)
  },

  create: async (data: TemplateCreate): Promise<Template> => {
    return api.post('/templates', data)
  },

  update: async (id: number, data: TemplateUpdate): Promise<Template> => {
    return api.put(`/templates/${id}`, data)
  },

  delete: async (id: number): Promise<void> => {
    return api.delete(`/templates/${id}`)
  },

  publish: async (id: number): Promise<Template> => {
    return api.post(`/templates/${id}/publish`)
  },

  unpublish: async (id: number): Promise<Template> => {
    return api.post(`/templates/${id}/unpublish`)
  },

  duplicate: async (id: number): Promise<Template> => {
    return api.post(`/templates/${id}/duplicate`)
  },

  getVersions: async (id: number): Promise<TemplateVersion[]> => {
    return api.get(`/templates/${id}/versions`)
  },

  rollback: async (id: number, versionId: number): Promise<Template> => {
    return api.post(`/templates/${id}/rollback/${versionId}`)
  },
}

