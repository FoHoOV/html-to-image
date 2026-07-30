import { Context } from '@/context'

type CloneContext<TNode extends Node> = Readonly<{
  originalNode: TNode
  context: Context
  clonedParentNode: Node | null
}>

export type Cloner<TNode extends Node> = (
  config: CloneContext<TNode>,
) => Node | Promise<Node>
