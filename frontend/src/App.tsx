import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/Layout'
import Home from './pages/Home'
import QueryWorkspace from './pages/QueryWorkspace'
import TemplateManagement from './pages/TemplateManagement'
import DataSourceManagement from './pages/DataSourceManagement'
import ModelGateway from './pages/ModelGateway'
import Logs from './pages/Logs'
import AgentChat from './pages/AgentChat'

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<AgentChat />} />
          <Route path="/query" element={<QueryWorkspace />} />
          <Route path="/templates" element={<TemplateManagement />} />
          <Route path="/datasources" element={<DataSourceManagement />} />
          <Route path="/models" element={<ModelGateway />} />
          <Route path="/logs" element={<Logs />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

export default App
