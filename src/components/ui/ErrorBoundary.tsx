import { Component, type ReactNode } from 'react'

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('App crash:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace' }}>
          <h1 style={{ color: '#DC2626' }}>Something went wrong</h1>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#FEF2F2', padding: 16, borderRadius: 8 }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
            style={{ marginTop: 16, padding: '8px 16px', borderRadius: 8 }}>
            Go home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
