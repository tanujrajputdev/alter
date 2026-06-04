import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import HUD from './components/HUD'
import Onboarding from './components/Onboarding'
import Dashboard from './components/Dashboard'

function App() {
  const params = new URLSearchParams(window.location.search)
  const view = params.get('view') ?? 'hud'

  if (view === 'onboarding') return <Onboarding />
  if (view === 'dashboard' || view === 'settings') return <Dashboard />
  return <HUD />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
