import {createStateManager} from "../lib/state.ts"

export type GetArtOptions = {
  id?: number
  user?: string
}

type CommandState =
  | {type: 'self-delete'}
  | {type: 'art-save'}
  | {
      type: 'art-retry'
      options?: GetArtOptions
    }

export const stateManager = createStateManager<CommandState>()