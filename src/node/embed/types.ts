import type { Context } from "@/context";

type EmbedContext<TNode extends Node> = Readonly<{
  originalNode: TNode;
  clonedNode: TNode;
  context: Context;
  clonedParentNode: Node | null;
}>;

export type Embedder<TNode extends Node, TResult extends void | Promise<void>> = (
  config: EmbedContext<TNode>,
) => TResult;
