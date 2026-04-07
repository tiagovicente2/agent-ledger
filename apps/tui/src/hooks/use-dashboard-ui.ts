import { useCallback, useReducer } from 'react'

export type OverlayKind = 'none' | 'help' | 'sources'

interface DashboardUiState {
  overlay: OverlayKind
  selectedSessionIndex: number
}

type DashboardUiAction =
  | { type: 'close-overlay' }
  | { type: 'move-selection'; delta: -1 | 1; total: number }
  | { type: 'reset-selection' }
  | { type: 'sync-selection'; total: number }
  | { type: 'toggle-overlay'; overlay: Exclude<OverlayKind, 'none'> }

const initialState: DashboardUiState = {
  overlay: 'none',
  selectedSessionIndex: 0,
}

function clampSelection(index: number, total: number) {
  if (total <= 0) {
    return 0
  }

  if (index < 0) {
    return 0
  }

  if (index >= total) {
    return total - 1
  }

  return index
}

function reducer(state: DashboardUiState, action: DashboardUiAction): DashboardUiState {
  switch (action.type) {
    case 'close-overlay':
      if (state.overlay === 'none') {
        return state
      }

      return {
        ...state,
        overlay: 'none',
      }

    case 'move-selection': {
      const nextIndex = clampSelection(state.selectedSessionIndex + action.delta, action.total)

      if (nextIndex === state.selectedSessionIndex) {
        return state
      }

      return {
        ...state,
        selectedSessionIndex: nextIndex,
      }
    }

    case 'reset-selection':
      if (state.selectedSessionIndex === 0) {
        return state
      }

      return {
        ...state,
        selectedSessionIndex: 0,
      }

    case 'sync-selection': {
      const nextIndex = clampSelection(state.selectedSessionIndex, action.total)

      if (nextIndex === state.selectedSessionIndex) {
        return state
      }

      return {
        ...state,
        selectedSessionIndex: nextIndex,
      }
    }

    case 'toggle-overlay':
      return {
        ...state,
        overlay: state.overlay === action.overlay ? 'none' : action.overlay,
      }

    default:
      return state
  }
}

export function useDashboardUi() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const closeOverlay = useCallback(() => dispatch({ type: 'close-overlay' }), [])
  const moveSelection = useCallback(
    (delta: -1 | 1, total: number) => dispatch({ type: 'move-selection', delta, total }),
    [],
  )
  const resetSelection = useCallback(() => dispatch({ type: 'reset-selection' }), [])
  const syncSelection = useCallback(
    (total: number) => dispatch({ type: 'sync-selection', total }),
    [],
  )
  const toggleOverlay = useCallback(
    (overlay: Exclude<OverlayKind, 'none'>) => dispatch({ type: 'toggle-overlay', overlay }),
    [],
  )

  return {
    closeOverlay,
    moveSelection,
    overlay: state.overlay,
    resetSelection,
    selectedSessionIndex: state.selectedSessionIndex,
    syncSelection,
    toggleOverlay,
  }
}
