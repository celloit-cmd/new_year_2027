import { useReducer } from 'react'
import { AppShell } from './app/AppShell.tsx'
import { experienceReducer, INITIAL_EXPERIENCE_STATE } from './app/experienceState.ts'
import { useReducedMotion } from './app/useReducedMotion.ts'

export function App() {
  const [state] = useReducer(experienceReducer, INITIAL_EXPERIENCE_STATE)
  const prefersReducedMotion = useReducedMotion()

  return <AppShell stage={state.stage} prefersReducedMotion={prefersReducedMotion} />
}

export default App
