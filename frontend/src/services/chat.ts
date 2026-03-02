import api from './api'
import {
  ChatSession,
  ChatSessionCreate,
  ChatSessionListItem,
  ChatMessage,
  ChatSendMessage,
} from '../types'

export const chatService = {
  createSession: async (data: ChatSessionCreate): Promise<ChatSession> => {
    return api.post('/chat/sessions', data)
  },

  listSessions: async (skip = 0, limit = 50): Promise<ChatSessionListItem[]> => {
    return api.get('/chat/sessions', { params: { skip, limit } })
  },

  getSession: async (sessionId: number): Promise<ChatSession> => {
    return api.get(`/chat/sessions/${sessionId}`)
  },

  sendMessage: async (
    sessionId: number,
    data: ChatSendMessage
  ): Promise<ChatMessage[]> => {
    return api.post(`/chat/sessions/${sessionId}/messages`, data)
  },

  deleteSession: async (sessionId: number): Promise<void> => {
    return api.delete(`/chat/sessions/${sessionId}`)
  },

  updateSession: async (
    sessionId: number,
    data: ChatSessionCreate
  ): Promise<ChatSession> => {
    return api.put(`/chat/sessions/${sessionId}`, data)
  },
}
