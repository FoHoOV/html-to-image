import { Options } from '@/types'

type CloneContext<TNode extends Node> = Readonly<{
  originalNode: TNode
  options: Options
  clonedParentNode: Node | null
}>

export type Cloner<TNode extends Node> = (
  context: CloneContext<TNode>,
) => Node | Promise<Node>

type EmbedContext<TNode extends Node> = Readonly<{
  originalNode: TNode
  clonedNode: TNode
  options: Options
  clonedParentNode: Node | null
}>

export type Embedder<TNode extends Node> = (
  context: EmbedContext<TNode>,
) => void | Promise<void>
