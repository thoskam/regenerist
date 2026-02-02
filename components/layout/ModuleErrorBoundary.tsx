'use client'

import { Component } from 'react'

interface Props {
  children: React.ReactNode
  moduleName: string
}

interface State {
  hasError: boolean
}

export class ModuleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg">
          <p className="text-red-400 text-sm">Failed to load {this.props.moduleName}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-slate-400 mt-2 hover:text-white"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
