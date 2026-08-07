import type { Context } from "@/context";

export type EmbedContext<TNode extends Node> = Readonly<{
  originalNode: TNode;
  clonedNode: TNode;
  context: Context;
  clonedParentNode: Node | null;
  /** The node the render was started from. Always cloned as an `HTMLElement`. */
  isRoot: boolean;
  /** The filter dropped this node but kept its descendants. */
  isUnwrapped: boolean;
}>;

export type Embedder<
  TNode extends Node,
  TResult extends void | Promise<void>,
> = (config: EmbedContext<TNode>) => TResult;
