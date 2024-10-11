export const createStateManager = <T extends Record<string, unknown>>() => {
  const createState = (state: T): string => JSON.stringify(state)
  const fromState = (data: string): T => {
    try {
      return JSON.parse(data) as T
    } catch (e) {
      return {} as any
    }
  }

  return {createState, fromState}
}

// const stateManager = createStateManager<{type: '1'}| {type:'2' ,test: '21'}>()

// stateManager.createState({type: '1'})
// stateManager.createState({test: '21',})
