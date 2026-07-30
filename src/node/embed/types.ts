import { Context } from '@/context'

type EmbedContext<TNode extends Node> = Readonly<{
  originalNode: TNode
  clonedNode: TNode
  context: Context
  clonedParentNode: Node | null
}>

export type Embedder<TNode extends Node> = (
  config: EmbedContext<TNode>,
) => void | Promise<void>
