import GreenfieldDiagram from './GreenfieldDiagram'
import BrownfieldDiagram from './BrownfieldDiagram'

export default function SiteDiagram({ state, config }) {
  const Diagram = config.siteType === 'greenfield' ? GreenfieldDiagram : BrownfieldDiagram

  return (
    <div className="w-full h-full rounded border border-sc-charcoal-light bg-sc-darker overflow-hidden">
      <Diagram state={state} config={config} />
    </div>
  )
}
