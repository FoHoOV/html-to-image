import { Options } from '@/types'

type CloneContext<TNode extends Node> = Readonly<{
  originalNode: TNode
  options: Options
  clonedParentNode: Node | null
}>

export type Cloner<TNode extends Node> = (
  context: CloneContext<TNode>,
) => Node | Promise<Node>
