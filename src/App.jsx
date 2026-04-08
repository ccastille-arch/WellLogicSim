import { useState, useCallback } from 'react'
import Header from './components/Header'
import ConfigPanel from './components/ConfigPanel'
import Simulator from './components/Simulator'

function App() {
  const [config, setConfig] = useState(null)
  const [tutorialMode, setTutorialMode] = useState(false)

  const handleLaunch = useCallback((cfg) => {
    setConfig(cfg)
  }, [])

  const handleReconfigure = useCallback(() => {
    setConfig(null)
    setTutorialMode(false)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-sc-darker">
      <Header
        onReconfigure={config ? handleReconfigure : null}
        tutorialMode={tutorialMode}
        onTutorialToggle={() => setTutorialMode(t => !t)}
        showTutorial={!!config}
      />
      {!config ? (
        <ConfigPanel onLaunch={handleLaunch} />
      ) : (
        <Simulator config={config} tutorialMode={tutorialMode} onTutorialEnd={() => setTutorialMode(false)} />
      )}
    </div>
  )
}

export default App
