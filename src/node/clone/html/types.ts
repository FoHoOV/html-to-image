import { Options } from '@/types'

type Context<TNode extends Node> = {
  node: TNode
  options: Options
  clonedParentNode: Node | null
}

export type Cloner<TNode extends Node> = (
  context: Context<TNode>,
) => Node | Promise<Node>
