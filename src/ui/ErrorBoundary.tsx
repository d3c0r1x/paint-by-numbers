import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useAppStore } from '../store/useAppStore'
import { translate, type Lang } from '../i18n'

interface Props {
  lang: Lang
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Last-resort boundary: a render error shows a readable message with a way
 * back home instead of unmounting the whole tree into a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      const t = (key: string) => translate(this.props.lang, key)
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-bold text-accent">{t('error.title')}</p>
          <p className="max-w-md break-all text-xs text-ink-faint">
            {this.state.error.message}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="rounded-xl bg-ink px-4 py-2 font-semibold text-paper"
            >
              {t('error.retry')}
            </button>
            <button
              onClick={() => {
                useAppStore.getState().reset()
                this.setState({ error: null })
              }}
              className="rounded-xl border border-paper-deep bg-paper px-4 py-2 font-semibold text-ink"
            >
              {t('processing.back')}
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
