
"use client"

import * as React from "react"
import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000
const HISTORY_LIMIT = 100;

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
  SET_HISTORY: "SET_HISTORY",
  MARK_ALL_AS_READ: "MARK_ALL_AS_READ",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["SET_HISTORY"];
      history: ToasterToast[];
      lastReadId: string | null;
    }
  | {
      type: ActionType["MARK_ALL_AS_READ"];
   };


interface State {
  toasts: ToasterToast[];
  history: ToasterToast[];
  lastReadId: string | null;
  unreadCount: number;
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

const getUnreadCount = (history: ToasterToast[], lastReadId: string | null) => {
    if (!lastReadId) return history.length;
    const lastReadIndex = history.findIndex(t => t.id === lastReadId);
    if (lastReadIndex === -1) return history.length;
    return lastReadIndex;
};


export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST": {
      const newHistory = [action.toast, ...state.history].slice(0, HISTORY_LIMIT);
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
        history: newHistory,
        unreadCount: getUnreadCount(newHistory, state.lastReadId),
      }
    }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }

    case "SET_HISTORY":
      return {
        ...state,
        history: action.history,
        lastReadId: action.lastReadId,
        unreadCount: getUnreadCount(action.history, action.lastReadId),
      };

    case "MARK_ALL_AS_READ": {
        const lastReadId = state.history.length > 0 ? state.history[0].id : null;
        return {
            ...state,
            lastReadId,
            unreadCount: 0,
        }
    }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [], history: [], lastReadId: null, unreadCount: 0 }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  });

  if (typeof window !== "undefined") {
    if (action.type === 'ADD_TOAST' || action.type === 'SET_HISTORY') {
      window.localStorage.setItem("toast_history", JSON.stringify(memoryState.history));
    }
    if (action.type === 'MARK_ALL_AS_READ' || action.type === 'SET_HISTORY') {
      window.localStorage.setItem("toast_last_read", memoryState.lastReadId || '');
    }
  }
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const historyStr = window.localStorage.getItem("toast_history");
      const lastReadId = window.localStorage.getItem("toast_last_read");
      const history = historyStr ? JSON.parse(historyStr) : [];
      dispatch({ type: 'SET_HISTORY', history, lastReadId });
    }
  }, []);

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
    markAllAsRead: () => dispatch({ type: "MARK_ALL_AS_READ" }),
  }
}

export { useToast, toast }
