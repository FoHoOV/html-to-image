import { Options } from '@/types'

type EmbedContext<TNode extends Node> = Readonly<{
  originalNode: TNode
  clonedNode: TNode
  options: Options
  clonedParentNode: Node | null
}>

export type Embedder<TNode extends Node> = (
  context: EmbedContext<TNode>,
) => void | Promise<void>
